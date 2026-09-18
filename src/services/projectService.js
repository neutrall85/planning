// src/services/ProjectService.js
import { TODAY } from '../utils/date';
import { PROJECT_STATUSES, PROJECT_TYPES } from '../utils/constants';
import { isArchived } from '../utils/entityState';
import { syncExecutorRolesFor } from './roleSync';
import {
  auditLabel,
  auditName,
  auditDetails,
  auditDelta,
  auditToggle,
  auditListDelta,
  auditMark,
} from '../utils/auditHelpers';

export class ProjectService {
  constructor({
    projectRepo,
    taskRepo,
    employeeRepo,
    notificationService,
    auditService,
    notify,
    canChangeStatus,
    canManageAccess,
    canRestore,
  }) {
    this._projectRepo = projectRepo;
    this._taskRepo = taskRepo;
    this._employeeRepo = employeeRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
    this._canChangeStatus = canChangeStatus;
    this._canManageAccess = canManageAccess;
    this._canRestore = canRestore;

    // Синхронизация производной роли executor - правило в roleSync.js.
    this._syncExecutorRoles = (empIds) =>
      syncExecutorRolesFor(empIds, { employeeRepo, taskRepo });
  }

  getAll() { return this._projectRepo.findAll(); }

  upsertProject(project, currentUser) {
    const existing = this._projectRepo.findById(project.id);
    const isNew = !existing;
    const currentUserId = currentUser?.id || 'system';

    if (!isNew && isArchived(existing) && isArchived(project)) {
      throw new Error('Проект в архиве - редактирование запрещено');
    }

    const isRestore = !isNew && isArchived(existing) && !isArchived(project);

    if (isRestore) {
      if (!currentUser || !this._canRestore(currentUser)) {
        throw new Error('Недостаточно прав для восстановления проекта из архива');
      }
    } else if (!isNew && existing.status !== project.status && currentUserId !== 'system') {
      const allowed = this._canChangeStatus
        && this._canChangeStatus(currentUser, existing, project.status);
      if (!allowed) {
        throw new Error('Переход в этот статус не разрешён для вашей роли');
      }
    }

    if (!isNew && isRestore) {
      this._audit.addAudit('Восстановление проекта', project.name, 'project', project.id, currentUserId);
    } else if (!isNew) {
      const changes = this._describeChanges(existing, project);
      if (Object.keys(changes).length > 0) {
        this._audit.addAudit(
          'Изменение проекта',
          auditDetails('Проект', project.name, changes),
          'project',
          project.id,
          currentUserId,
        );
      }
    } else {
      this._audit.addAudit('Создание проекта', project.name, 'project', project.id, currentUserId);
    }

    const affectedEmpIds = new Set();

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
          if (task.assigneeId) {
            assigneeIds.add(task.assigneeId);
            affectedEmpIds.add(task.assigneeId);
          }
          this._notifications.notifyTaskArchived(task, project, currentUserId);
        }
      }
      this._notifications.notifyProjectArchived(project, assigneeIds, currentUserId);
    }

    if (isNew) {
      this._notifications.notifyProjectCreated(project, currentUserId);
    } else if (existing && !isRestore) {
      if (existing.managerId !== project.managerId && project.managerId) {
        this._notifications.notifyProjectManagerChanged(project, currentUserId);
      }
      if (existing.status !== project.status && project.status !== 'closed' && project.status !== 'cancelled') {
        this._notifications.notifyProjectStatusChanged(project, currentUserId);
      }
    }

    this._projectRepo.save(project);

    if (affectedEmpIds.size) this._syncExecutorRoles(affectedEmpIds);

    this._notify();
  }

  patchProject(projectId, patch, currentUser) {
    const existing = this._projectRepo.findById(projectId);
    if (!existing) throw new Error('Проект не найден');
    if (isArchived(existing)) throw new Error('Проект в архиве - редактирование запрещено');

    const updated = { ...existing, ...patch };
    this._projectRepo.save(updated);

    const changes = this._describeChanges(existing, updated);
    if (Object.keys(changes).length > 0) {
      this._audit.addAudit(
        'Изменение проекта',
        auditDetails('Проект', updated.name, changes),
        'project',
        projectId,
        currentUser?.id || 'system',
      );
    }

    this._notify();
    return updated;
  }

  _describeChanges(existing, next) {
    const changes = {};

    auditDelta(changes, 'Название', existing.name, next.name, (v) => (v ? `«${v}»` : '-'));
    auditDelta(changes, 'Код', existing.code, next.code);
    auditDelta(changes, 'Статус', existing.status, next.status, (v) => auditLabel(PROJECT_STATUSES, v));
    auditDelta(changes, 'Тип', existing.ptype, next.ptype, (v) => auditLabel(PROJECT_TYPES, v));
    auditDelta(changes, 'Приоритет', existing.priority, next.priority);
    auditDelta(changes, 'Ответственный', existing.managerId, next.managerId, (v) => auditName(this._employeeRepo, v));
    auditDelta(changes, 'Бюджет', existing.budget, next.budget);
    auditDelta(changes, 'Дата начала', existing.start, next.start);
    auditDelta(changes, 'Дата окончания', existing.end, next.end);
    auditDelta(changes, 'Заказчик', existing.customer, next.customer);
    auditDelta(changes, 'Тип ВС', existing.aircraftType, next.aircraftType);
    auditDelta(changes, 'Категория', existing.projectType, next.projectType);

    auditToggle(changes, 'Долгосрочный', existing.longterm, next.longterm, 'включён', 'выключен');

    auditMark(changes, 'Описание', existing.desc, next.desc, 'изменено');
    auditMark(changes, 'Подразделение', existing.kbId, next.kbId, 'изменено');

    auditListDelta(changes, 'Вложения', existing.files, next.files, (f) => f.id, (f) => f.name);
    auditListDelta(changes, 'Фото', existing.photos, next.photos, (p) => p.id, (p) => p.name);
    auditListDelta(changes, 'Папки', existing.folders, next.folders, (f) => f.id, (f) => f.name);

    return changes;
  }

  deleteProject(id, currentUserId) {
    const project = this._projectRepo.findById(id);
    if (project && isArchived(project)) {
      throw new Error('Проект в архиве - удаление запрещено');
    }
    if (project) {
      this._audit.addAudit('Удаление проекта', project.name, 'project', id, currentUserId);
    }
    this._projectRepo.delete(id);

    const tasks = this._taskRepo.findByProject(id);
    const affectedEmpIds = new Set();
    for (const task of tasks) {
      if (task.assigneeId) affectedEmpIds.add(task.assigneeId);
      this._taskRepo.delete(task.id);
    }

    if (affectedEmpIds.size) this._syncExecutorRoles(affectedEmpIds);

    this._notify();
  }

  setAccess(projectId, access, currentUser) {
    const project = this._projectRepo.findById(projectId);
    if (!project) throw new Error('Проект не найден');
    if (isArchived(project)) throw new Error('Проект в архиве - редактирование запрещено');

    const allowed = currentUser && this._canManageAccess
      && this._canManageAccess(currentUser, project);
    if (!allowed) {
      throw new Error('Недостаточно прав для управления доступом к проекту');
    }

    const userIds = Array.isArray(access?.userIds) ? [...access.userIds] : [];
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
        grantedTo: names.length ? names.join(', ') : '-',
      },
      'project',
      project.id,
      currentUser.id,
    );
    this._notify();
    return project;
  }
}