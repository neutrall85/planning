// src/services/TaskService.js
import { TODAY, iso, fmtDMY, uid } from '../utils/date';
import { TASK_STATUSES, PRIORITIES } from '../utils/constants';
import { isArchived } from '../utils/entityState';
import { syncExecutorRolesFor } from './roleSync';
import {
  auditValue,
  auditLabel,
  auditName,
  auditDetails,
  auditDelta,
  auditToggle,
  auditListDelta,
  auditHoursDelta,
  auditMark,
} from '../utils/auditHelpers';

export class TaskService {
  /**
   * Конструктор принимает объект зависимостей, а не позиционный список.
   *
   * Раньше было десять позиционных аргументов подряд, среди которых
   * три подряд идущих предиката с почти одинаковыми именами
   * (canChangeStatus, canRestore, canRestoreTask). Перестановка двух
   * из них местами не давала никакой ошибки на этапе создания сервиса -
   * падало только при вызове конкретного метода, далеко от места
   * ошибки. С объектом каждое имя видно у вызывающего, и такие
   * перестановки становятся невозможны.
   *
   * Синхронизация производной роли executor - правило живёт в
   * roleSync.js. Здесь только «склеиваем» его с конкретными
   * репозиториями сервиса, чтобы в методах не повторять объект
   * зависимостей.
   */
  constructor({
    taskRepo,
    employeeRepo,
    budgetService,
    notificationService,
    auditService,
    notify,
    canChangeStatus,
    canRestore,
    canRestoreTask,
    getData,
  }) {
    this._taskRepo = taskRepo;
    this._employeeRepo = employeeRepo;
    this._budget = budgetService;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
    this._canChangeStatus = canChangeStatus;
    this._canRestore = canRestore;
    this._canRestoreTask = canRestoreTask;
    this._getData = getData;

    this._syncExecutorRoles = (empIds) =>
      syncExecutorRolesFor(empIds, { employeeRepo, taskRepo });
  }

  getAll() { return this._taskRepo.findAll(); }

  upsertTask(task, currentUserId) {
    const existing = this._taskRepo.findById(task.id);
    const isNew = !existing;

    if (!isNew && isArchived(existing) && isArchived(task)) {
      throw new Error('Задача в архиве - редактирование запрещено');
    }

    const isRestore = !isNew && isArchived(existing) && !isArchived(task);

    if (isRestore) {
      const user = this._employeeRepo.findById(currentUserId);
      if (!user || !this._canRestore(user)) {
        throw new Error('Недостаточно прав для восстановления задачи из архива');
      }
      if (!this._canRestoreTask(user, task, this._getData())) {
        throw new Error('Нельзя восстановить задачу: проект в архиве - сначала восстановите проект');
      }
    } else if (!isNew && existing.status !== task.status && currentUserId !== 'system') {
      const user = this._employeeRepo.findById(currentUserId);
      const allowed = user && this._canChangeStatus(user, existing, task.status, this._getData());
      if (!allowed) {
        throw new Error('Переход в этот статус не разрешён для вашей роли');
      }
    }

    if (task.logs && Array.isArray(task.logs)) {
      task.actualHours = task.logs.reduce((sum, log) => sum + (log.hours || 0), 0);
    } else {
      task.actualHours = 0;
    }

    if (isNew && task.isSummary && task.budgetHours === undefined) {
      task.budgetHours = task.plannedHours || 0;
    }

    if (task.projectId) {
      this._budget.checkProjectBudget(task.projectId, task.id, task.plannedHours);
    }

    if (task.parentTaskId) {
      const excludeId = isNew ? null : task.id;
      const planned = parseFloat(task.plannedHours) || 0;
      if (!this._budget.canAddChildToParent(task.parentTaskId, planned, excludeId)) {
        const parent = this._taskRepo.findById(task.parentTaskId);
        const parentName = parent ? `"${parent.title}"` : 'родительской задачи';
        const remaining = this._budget.getRemainingHours(task.parentTaskId);
        throw new Error(
          `Невозможно добавить/обновить подзадачу: превышение бюджета ${parentName}. ` +
          `Остаток бюджета: ${remaining !== null ? remaining : 'неизвестен'} ч. ` +
          `Запрошено: ${planned} ч.`
        );
      }
    }

    if (!isNew) {
      if (!task.isSummary && task.plannedHours != null) {
        const children = this._taskRepo.findChildren(task.id);
        const sumChildren = children.reduce((acc, t) => acc + (parseFloat(t.plannedHours) || 0), 0);
        if (sumChildren > parseFloat(task.plannedHours)) {
          throw new Error(
            `Сумма плановых часов подзадач (${sumChildren} ч) превышает новый бюджет задачи "${task.title}" (${task.plannedHours} ч).`
          );
        }
      }
      if (task.isSummary && task.plannedHours !== undefined && task.plannedHours !== existing.plannedHours) {
        task.plannedHours = existing.plannedHours;
        task.budgetHours = existing.budgetHours ?? existing.plannedHours ?? 0;
      }
    } else {
      if (task.parentTaskId) {
        const parent = this._taskRepo.findById(task.parentTaskId);
        if (parent && !task.projectId) {
          task.projectId = parent.projectId;
        } else if (!parent) {
          task.parentTaskId = null;
        }
      }
      if (!task.createdAt) task.createdAt = new Date().toISOString();
    }

    if (task.parentTaskId) {
      const parent = this._taskRepo.findById(task.parentTaskId);
      if (parent && !parent.isSummary) {
        parent.isSummary = true;
        if (parent.budgetHours === undefined || parent.budgetHours === null) {
          parent.budgetHours = parent.plannedHours || 0;
        }
        this._taskRepo.save(parent);
      }
    }

    this._taskRepo.save(task);

    if (isNew) {
      this._audit.addAudit('Создание задачи', task.title, 'task', task.id, currentUserId);
    } else if (isRestore) {
      this._audit.addAudit('Восстановление задачи', task.title, 'task', task.id, currentUserId);
    } else {
      const changes = this._describeChanges(existing, task);
      if (Object.keys(changes).length > 0) {
        this._audit.addAudit(
          'Изменение задачи',
          auditDetails('Задача', task.title, changes),
          'task',
          task.id,
          currentUserId,
        );
      }
    }

    if (isNew) {
      this._notifications.notifyTaskCreated(task, currentUserId);
    } else if (existing && !isRestore) {
      if (existing.assigneeId !== task.assigneeId && task.assigneeId) {
        this._notifications.notifyTaskReassigned(task, existing.assigneeId, currentUserId);
      }
      if (existing.deadline !== task.deadline) {
        this._notifications.notifyTaskDeadlineChanged(task, existing.deadline, currentUserId);
      }
      if (existing.plannedHours !== task.plannedHours) {
        this._notifications.notifyTaskHoursChanged(task, existing.plannedHours, currentUserId);
      }
      if (existing.status !== task.status) {
        this._notifications.notifyTaskStatusChanged(task, currentUserId);
      }
    }

    this._recalcSummaryChain(task);

    const affectedEmpIds = new Set();
    if (task.assigneeId) affectedEmpIds.add(task.assigneeId);
    if (existing?.assigneeId && existing.assigneeId !== task.assigneeId) {
      affectedEmpIds.add(existing.assigneeId);
    }
    if (affectedEmpIds.size) this._syncExecutorRoles(affectedEmpIds);

    this._notify();
    return task;
  }

  patchTask(taskId, patch, currentUserId) {
    const existing = this._taskRepo.findById(taskId);
    if (!existing) throw new Error('Задача не найдена');
    if (isArchived(existing)) throw new Error('Задача в архиве - редактирование запрещено');

    const updated = { ...existing, ...patch };
    if (patch.logs) {
      updated.actualHours = patch.logs.reduce((s, l) => s + (l.hours || 0), 0);
    }
    this._taskRepo.save(updated);

    const changes = this._describeChanges(existing, updated);
    if (Object.keys(changes).length > 0) {
      this._audit.addAudit(
        'Изменение задачи',
        auditDetails('Задача', updated.title, changes),
        'task',
        taskId,
        currentUserId,
      );
    }

    if (patch.assigneeId !== undefined && patch.assigneeId !== existing.assigneeId) {
      const affected = new Set([patch.assigneeId, existing.assigneeId].filter(Boolean));
      if (affected.size) this._syncExecutorRoles(affected);
    }

    this._notify();
    return updated;
  }

  _describeChanges(existing, next) {
    const changes = {};

    auditDelta(changes, 'Название', existing.title, next.title, (v) => (v ? `«${v}»` : '-'));
    auditDelta(changes, 'Дата начала', existing.start, next.start);
    auditDelta(changes, 'Срок', existing.deadline, next.deadline);
    auditDelta(changes, 'Плановые часы', existing.plannedHours, next.plannedHours);
    auditDelta(changes, 'Статус', existing.status, next.status, (v) => auditLabel(TASK_STATUSES, v));
    auditDelta(changes, 'Приоритет', existing.priority, next.priority, (v) => auditLabel(PRIORITIES, v));
    auditDelta(changes, 'Исполнитель', existing.assigneeId, next.assigneeId, (v) => auditName(this._employeeRepo, v));

    auditToggle(changes, 'Суммарная задача', existing.isSummary, next.isSummary, 'включена', 'выключена');
    auditToggle(changes, 'Часовая задача', existing.isHourly, next.isHourly, 'включена', 'выключена');

    auditMark(changes, 'Описание', existing.desc, next.desc, 'изменено');
    auditMark(changes, 'Проект', existing.projectId, next.projectId, 'изменён');
    auditMark(changes, 'Родительская задача', existing.parentTaskId, next.parentTaskId, 'изменена');
    auditMark(changes, 'Зависимость', existing.dependencyId, next.dependencyId, 'изменена');

    if (existing.isHourly && next.isHourly) {
      const prevRange = `${auditValue(existing.startTime)}–${auditValue(existing.endTime)}`;
      const nextRange = `${auditValue(next.startTime)}–${auditValue(next.endTime)}`;
      if (prevRange !== nextRange) changes['Время'] = `${prevRange} → ${nextRange}`;
    }

    if (next.dependencyId) {
      auditDelta(changes, 'Тип зависимости', existing.dependencyType, next.dependencyType);
    }

    auditListDelta(changes, 'Вложения', existing.files, next.files, (f) => f.id, (f) => f.name);
    auditHoursDelta(changes, 'Записи часов', existing.logs, next.logs, next.plannedHours);

    return changes;
  }

  deleteTask(id, currentUserId) {
    const task = this._taskRepo.findById(id);
    if (task && isArchived(task)) {
      throw new Error('Задача в архиве - удаление запрещено');
    }
    if (task) {
      this._audit.addAudit('Удаление задачи', task.title, 'task', id, currentUserId);
    }
    const parentId = task?.parentTaskId;
    const affectedAssigneeId = task?.assigneeId;

    const children = this._taskRepo.findChildren(id);
    for (const child of children) {
      child.parentTaskId = null;
      this._taskRepo.save(child);
    }

    this._taskRepo.delete(id);

    if (parentId) {
      const parent = this._taskRepo.findById(parentId);
      if (parent) {
        const remainingChildren = this._taskRepo.findChildren(parentId);
        if (remainingChildren.length === 0) {
          parent.isSummary = false;
          parent.budgetHours = null;
          this._taskRepo.save(parent);
        }
        this._recalcSummaryChain(parent);
      }
    }

    if (affectedAssigneeId) this._syncExecutorRoles([affectedAssigneeId]);

    this._notify();
  }

  addTaskLog(taskId, message, userId = 'system') {
    const task = this._taskRepo.findById(taskId);
    if (!task) throw new Error('Задача не найдена');
    if (isArchived(task)) throw new Error('Задача в архиве - редактирование запрещено');
    task.history = task.history || [];
    task.history.push({ ts: Date.now(), who: userId, text: message });
    this._taskRepo.save(task);
    this._notify();
    this._audit.addAudit('Добавлен лог задачи', message, 'task', taskId, userId);
  }

  upsertTaskNote(taskId, empId, noteData) {
    const task = this._taskRepo.findById(taskId);
    if (!task) throw new Error('Задача не найдена');
    if (isArchived(task)) throw new Error('Задача в архиве - редактирование запрещено');
    if (task.assigneeId !== empId) {
      throw new Error('Заметки может оставлять только исполнитель задачи');
    }

    const title = String(noteData?.title ?? '').trim();
    const text = String(noteData?.text ?? '').trim();
    if (!title && !text) {
      throw new Error('Заметка не может быть пустой');
    }

    const notes = { ...(task.notes || {}) };
    const list = Array.isArray(notes[empId]) ? [...notes[empId]] : [];

    const isNew = !noteData.id;
    if (isNew) {
      list.push({
        id: 'note_' + uid(),
        title,
        text,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      const idx = list.findIndex(n => n.id === noteData.id);
      if (idx < 0) throw new Error('Заметка не найдена');
      list[idx] = { ...list[idx], title, text, updatedAt: Date.now() };
    }

    notes[empId] = list;
    task.notes = notes;
    this._taskRepo.save(task);

    this._audit.addAudit(
      isNew ? 'Добавлена личная заметка' : 'Изменена личная заметка',
      task.title,
      'task',
      task.id,
      empId,
    );

    this._notify();
    return task;
  }

  deleteTaskNote(taskId, empId, noteId) {
    const task = this._taskRepo.findById(taskId);
    if (!task) throw new Error('Задача не найдена');
    if (isArchived(task)) throw new Error('Задача в архиве - редактирование запрещено');
    if (task.assigneeId !== empId) {
      throw new Error('Удалять можно только свои заметки');
    }

    const notes = { ...(task.notes || {}) };
    const list = Array.isArray(notes[empId])
      ? notes[empId].filter(n => n.id !== noteId)
      : [];

    if (list.length === 0) delete notes[empId];
    else notes[empId] = list;

    task.notes = notes;
    this._taskRepo.save(task);

    this._audit.addAudit('Удалена личная заметка', task.title, 'task', task.id, empId);

    this._notify();
    return task;
  }

  archiveOldTasks(months = 3) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffIso = iso(cutoff);
    let changed = false;
    const affectedEmpIds = new Set();
    const all = this._taskRepo.findAll();
    for (const task of all) {
      if (task.archived) continue;
      if ((task.status === 'closed' || task.status === 'cancelled') && task.closedAt && task.closedAt < cutoffIso) {
        task.archived = true;
        task.archivedAt = TODAY;
        this._taskRepo.save(task);
        if (task.assigneeId) affectedEmpIds.add(task.assigneeId);
        changed = true;
      }
    }
    if (changed) {
      if (affectedEmpIds.size) this._syncExecutorRoles(affectedEmpIds);
      this._audit.addAudit('Автоматическая архивация задач', `Задачи, закрытые более ${months} мес., перемещены в архив`, null, null, 'system');
      this._notify();
    }
  }

  _recalcSummaryChain(task) {
    let current = task;
    const visited = new Set();
    while (current?.parentTaskId && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = this._taskRepo.findById(current.parentTaskId);
      if (!parent) break;
      if (!parent.isSummary) {
        parent.isSummary = true;
        this._taskRepo.save(parent);
      }
      current = parent;
    }
  }

  getRemainingHours(taskId) { return this._budget.getRemainingHours(taskId); }

  setBudget(taskId, newBudget, currentUserId) {
    const task = this._taskRepo.findById(taskId);
    if (task && isArchived(task)) {
      throw new Error('Задача в архиве - редактирование запрещено');
    }
    const oldBudget = task?.budgetHours ?? task?.plannedHours;
    const updated = this._budget.setBudget(taskId, newBudget);
    this._audit.addAudit(
      'Изменение бюджета задачи',
      { Задача: updated.title, Бюджет: `${auditValue(oldBudget)} → ${newBudget}` },
      'task',
      taskId,
      currentUserId,
    );
    this._notify();
    return updated;
  }

  applyDelegation(fromId, toId, start, end, statuses) {
    const tasks = this._taskRepo.findByAssignee(fromId)
      .filter(t => !t.archived && statuses.includes(t.status) && (!t.deadline || t.deadline >= start));
    for (const task of tasks) {
      task.assigneeId = toId;
      task.history = task.history || [];
      const fromName = this._employeeRepo.findById(fromId)?.last || 'сотрудник';
      const toName = this._employeeRepo.findById(toId)?.last || 'сотрудник';
      task.history.push({
        ts: Date.now(),
        who: 'system',
        text: `Задача переназначена с ${fromName} на ${toName} на период отпуска с ${fmtDMY(start)} по ${fmtDMY(end)}`
      });
      this._taskRepo.save(task);
    }
    if (tasks.length > 0) {
      this._syncExecutorRoles([fromId, toId]);
      this._notify();
    }
  }

  revertDelegation(fromId, toId) {
    const tasks = this._taskRepo.findByAssignee(toId)
      .filter(t => !t.archived && t.history && t.history.some(h => h.text.includes(`переназначена с ${this._employeeRepo.findById(fromId)?.last || ''}`)));
    for (const task of tasks) {
      task.assigneeId = fromId;
      task.history.push({
        ts: Date.now(),
        who: 'system',
        text: `Задача возвращена ${this._employeeRepo.findById(fromId)?.last || 'сотруднику'} по окончании отпуска`
      });
      this._taskRepo.save(task);
    }
    if (tasks.length > 0) {
      this._syncExecutorRoles([fromId, toId]);
      this._notify();
    }
  }
}