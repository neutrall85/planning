// src/services/ProjectService.js
import { TODAY } from '../utils/date';

export class ProjectService {
  constructor(
    projectRepo,
    taskRepo,
    employeeRepo,
    notificationService,
    auditService,
    notifyCallback,
    canChangeStatus,
    canManageAccess,
  ) {
    this._projectRepo = projectRepo;
    this._taskRepo = taskRepo;
    this._employeeRepo = employeeRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notifyCallback;
    this._canChangeStatus = canChangeStatus;
    this._canManageAccess = canManageAccess;
  }

  getAll() { return this._projectRepo.findAll(); }

  /**
   * Сохранение проекта.
   *
   * Аргумент `currentUser` — полный объект пользователя (не id), потому
   * что право на смену статуса проверяется через canChangeProjectStatus,
   * а она смотрит роли и kbIds.
   *
   * Системные вызовы (user === null) пропускаются: они идут из
   * автоматических сценариев (архивация, восстановление).
   */
  upsertProject(project, currentUser) {
    const existing = this._projectRepo.findById(project.id);
    const isNew = !existing;
    const currentUserId = currentUser?.id || 'system';

    if (!isNew && existing.status !== project.status && currentUserId !== 'system') {
      const allowed = this._canChangeStatus
        && this._canChangeStatus(currentUser, existing, project.status);
      if (!allowed) {
        throw new Error('Переход в этот статус не разрешён для вашей роли');
      }
    }

    if (!isNew) {
      this._audit.addAudit('Изменение проекта', `Обновлён проект "${project.name}"`, 'project', project.id, currentUserId);
    } else {
      this._audit.addAudit('Создание проекта', project.name, 'project', project.id, currentUserId);
    }

    // Архивация при закрытии/отмене
    if (!isNew && (project.status === 'closed' || project.status === 'cancelled') && existing.status !== project.status) {
      project.archived = true;
      project.archivedAt = TODAY;
      const tasks = this._taskRepo.findByProject(project.id);
      const assigneeIds = new Set();
      for (const task of tasks) {
        if (!task.archived) {
          task.archived = true;
          task.archivedAt = TODAY;
          this._taskRepo.save(task);
          if (task.assigneeId) assigneeIds.add(task.assigneeId);
          this._notifications.notifyTaskArchived(task, project, currentUserId);
        }
      }
      this._notifications.notifyProjectArchived(project, assigneeIds, currentUserId);
    }

    // Уведомления по проекту
    if (isNew) {
      this._notifications.notifyProjectCreated(project, currentUserId);
    } else if (existing) {
      if (existing.managerId !== project.managerId && project.managerId) {
        this._notifications.notifyProjectManagerChanged(project, currentUserId);
      }
      if (existing.status !== project.status && project.status !== 'closed' && project.status !== 'cancelled') {
        this._notifications.notifyProjectStatusChanged(project, currentUserId);
      }
    }

    this._projectRepo.save(project);
    this._notify();
  }

  deleteProject(id, currentUserId) {
    const project = this._projectRepo.findById(id);
    if (project) {
      this._audit.addAudit('Удаление проекта', project.name, 'project', id, currentUserId);
    }
    this._projectRepo.delete(id);
    const tasks = this._taskRepo.findByProject(id);
    for (const task of tasks) this._taskRepo.delete(task.id);
    this._notify();
  }

  /**
   * Обновление списка явного доступа к проекту.
   *
   * Единственная точка входа: форма проекта это поле не трогает.
   * Роль-доступ сюда не попадает — он часть computeBaseScope и
   * настраивается ролями сотрудника, а не этим методом.
   *
   * Право проверяется тем же предикатом, что и в UI —
   * canManageProjectAccess. Массив копируется, чтобы состояние формы
   * не становилось частью store.
   *
   * Аудит фиксирует имена, а не только количество: журнал должен
   * отвечать на вопрос «кому именно», а не «сколько». Разрешение
   * id → ФИО живёт здесь, потому что это часть формирования записи
   * аудита; никакой UI-логики сюда не протекает.
   */
  setAccess(projectId, access, currentUser) {
    const project = this._projectRepo.findById(projectId);
    if (!project) throw new Error('Проект не найден');

    const allowed = currentUser && this._canManageAccess
      && this._canManageAccess(currentUser, project);
    if (!allowed) {
      throw new Error('Недостаточно прав для управления доступом к проекту');
    }

    const userIds = Array.isArray(access?.userIds) ? [...access.userIds] : [];

    // Имена для журнала. Отсутствующие id молча пропускаем — данные
    // могут быть устаревшими, но это не должно валить сохранение.
    const names = userIds
      .map(id => this._employeeRepo.findById(id))
      .filter(Boolean)
      .map(e => `${e.last} ${e.first}`);

    project.access = { userIds };
    this._projectRepo.save(project);

    this._audit.addAudit(
      'Изменение доступа к проекту',
      {
        project: project.name,
        grantedTo: names.length ? names.join(', ') : '—',
      },
      'project',
      project.id,
      currentUser.id,
    );
    this._notify();
    return project;
  }
}