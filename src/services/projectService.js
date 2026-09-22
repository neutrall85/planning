// src/services/ProjectService.js
import { TODAY } from '../utils/date';
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_PRIORITIES,
  ADMIN_PROJECT_PRIORITIES,
} from '../utils/constants';
import { isArchived } from '../utils/entityState';
import { syncExecutorRolesFor } from './roleSync';
import {
  auditHours,
  auditLabel,
  auditName,
  auditDetails,
  auditDelta,
  auditToggle,
  auditListDelta,
  auditMark,
  historyDelta,
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

    if (isRestore) {
      project.history = [
        ...(project.history || []),
        { ts: Date.now(), who: currentUserId, text: 'Восстановлен из архива' },
      ];
    } else if (!isNew) {
      const entries = this._historyEntries(existing, project);
      if (entries.length > 0) {
        const ts = Date.now();
        project.history = [
          ...(project.history || []),
          ...entries.map(text => ({ ts, who: currentUserId, text })),
        ];
      }
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

    const entries = this._historyEntries(existing, updated);
    if (entries.length > 0) {
      const ts = Date.now();
      updated.history = [
        ...(updated.history || []),
        ...entries.map(text => ({ ts, who: currentUser?.id || 'system', text })),
      ];
    }

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

  /**
   * Дифф по полям проекта для журнала аудита.
   *
   * Подразделения - массив id. auditListDelta сравнит составы и
   * напишет «добавлены: kb_la; удалены: kb_ad» - имена на этом
   * уровне недоступны (у сервиса нет kbRepo), а id КБ и отделов
   * короткие и читаемые, поэтому keyOf и nameOf здесь тождественны.
   */
  _describeChanges(existing, next) {
    const changes = {};

    auditDelta(changes, 'Название', existing.name, next.name, (v) => (v ? `«${v}»` : '-'));
    auditDelta(changes, 'Код', existing.code, next.code);
    auditDelta(changes, 'Статус', existing.status, next.status, (v) => auditLabel(PROJECT_STATUSES, v));
    auditDelta(changes, 'Тип', existing.ptype, next.ptype, (v) => auditLabel(PROJECT_TYPES, v));
    auditDelta(changes, 'Приоритет', existing.priority, next.priority);
    auditDelta(changes, 'Ответственный', existing.managerId, next.managerId, (v) => auditName(this._employeeRepo, v));
    auditDelta(changes, 'План', existing.budget, next.budget);
    auditDelta(changes, 'Дата начала', existing.start, next.start);
    auditDelta(changes, 'Дата окончания', existing.end, next.end);
    auditDelta(changes, 'Заказчик', existing.customer, next.customer);
    auditDelta(changes, 'Тип ВС', existing.aircraftType, next.aircraftType);
    auditDelta(changes, 'Категория', existing.projectType, next.projectType);

    auditToggle(changes, 'Долгосрочный', existing.longterm, next.longterm, 'включён', 'выключен');

    auditMark(changes, 'Описание', existing.desc, next.desc, 'изменено');
    auditListDelta(
      changes,
      'Подразделения',
      existing.unitIds,
      next.unitIds,
      (id) => id,
      (id) => id,
    );

    auditListDelta(changes, 'Вложения', existing.files, next.files, (f) => f.id, (f) => f.name);
    auditListDelta(changes, 'Фото', existing.photos, next.photos, (p) => p.id, (p) => p.name);
    auditListDelta(changes, 'Папки', existing.folders, next.folders, (f) => f.id, (f) => f.name);

    return changes;
  }

  _historyEntries(existing, next) {
    const entries = [];
    const employeeName = (id) => auditName(this._employeeRepo, id);
    const priorityMap = (ptype) => ptype === 'admin' ? ADMIN_PROJECT_PRIORITIES : PROJECT_PRIORITIES;

    historyDelta(entries, 'Название', existing.name, next.name, (v) => v ? `«${v}»` : '—');
    historyDelta(entries, 'Код', existing.code, next.code);
    historyDelta(entries, 'Тип проекта', existing.ptype, next.ptype, (v) => auditLabel(PROJECT_TYPES, v));
    historyDelta(entries, 'Приоритет', existing.priority, next.priority, (v) => auditLabel(priorityMap(next.ptype), v));
    historyDelta(entries, 'Ответственный', existing.managerId, next.managerId, employeeName);
    historyDelta(entries, 'План', existing.budget, next.budget, auditHours);
    historyDelta(entries, 'Дата начала', existing.start, next.start);
    historyDelta(entries, 'Дата окончания', existing.end, next.end);
    historyDelta(entries, 'Заказчик', existing.customer, next.customer);
    historyDelta(entries, 'Тип ВС', existing.aircraftType, next.aircraftType);
    historyDelta(entries, 'Категория', existing.projectType, next.projectType);

    if (!!existing.longterm !== !!next.longterm) {
      entries.push(next.longterm ? 'Долгосрочный проект включён' : 'Долгосрочный проект выключен');
    }

    if (existing.status !== next.status) {
      entries.push(
        `Статус: ${auditLabel(PROJECT_STATUSES, existing.status)} → ${auditLabel(PROJECT_STATUSES, next.status)}`
      );
    }

    return entries;
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
    const prevIds = Array.isArray(project.access?.userIds) ? project.access.userIds : [];

    // «Доступ не изменился» - не пишем ни в историю, ни в аудит,
    // не сохраняем: DataStore._notify() без реальных изменений
    // — лишний каскадный рендер подписчиков.
    const sameSet =
      userIds.length === prevIds.length &&
      userIds.every(id => prevIds.includes(id));
    if (sameSet) return project;

    const names = userIds
      .map(id => this._employeeRepo.findById(id))
      .filter(Boolean)
      .map(e => `${e.last} ${e.first}`);

    project.access = { userIds };
    project.history = [
      ...(project.history || []),
      {
        ts: Date.now(),
        who: currentUser.id,
        text: names.length
          ? `Доступ к проекту обновлён: ${names.join(', ')}`
          : 'Доступ к проекту очищен',
      },
    ];
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