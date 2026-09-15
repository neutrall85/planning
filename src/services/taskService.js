// src/services/TaskService.js
import { TODAY, iso, fmtDMY } from '../utils/date';

export class TaskService {
  constructor(
    taskRepo,
    projectRepo,
    employeeRepo,
    budgetService,
    notificationService,
    auditService,
    notifyCallback,
    canChangeStatus,
    getData,
  ) {
    this._taskRepo = taskRepo;
    this._projectRepo = projectRepo;
    this._employeeRepo = employeeRepo;
    this._budget = budgetService;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notifyCallback;
    // Внедряем правило перехода статуса, чтобы оно было единственным
    // источником правды и для drag-and-drop (TasksView), и для модалки.
    this._canChangeStatus = canChangeStatus;
    this._getData = getData;
  }

  getAll() { return this._taskRepo.findAll(); }

  upsertTask(task, currentUserId) {
    const existing = this._taskRepo.findById(task.id);
    const isNew = !existing;

    // Инвариант: смена статуса проходит через тот же whitelist, что
    // используется в drag-and-drop. Иначе правило можно обойти, сохранив
    // задачу через модалку. Системные вызовы (currentUserId === 'system')
    // пропускаются: они идут из archiveOldTasks и не меняют status.
    if (!isNew && existing.status !== task.status && currentUserId !== 'system') {
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

    // Гарантия: если у задачи есть подзадачи - она суммарная
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

    // Логирование
    if (isNew) {
      this._audit.addAudit('Создание задачи', task.title, 'task', task.id, currentUserId);
    } else {
      this._audit.addAudit('Изменение задачи', `Обновлена задача "${task.title}"`, 'task', task.id, currentUserId);
    }

    // Уведомления (единый сервис)
    if (isNew) {
      this._notifications.notifyTaskCreated(task, currentUserId);
    } else if (existing) {
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
    this._notify();
    return task;
  }

  deleteTask(id, currentUserId) {
    const task = this._taskRepo.findById(id);
    if (task) {
      this._audit.addAudit('Удаление задачи', task.title, 'task', id, currentUserId);
    }
    const parentId = task?.parentTaskId;

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
    this._notify();
  }

  addTaskLog(taskId, message, userId = 'system') {
    const task = this._taskRepo.findById(taskId);
    if (!task) throw new Error('Задача не найдена');
    task.history = task.history || [];
    task.history.push({ ts: Date.now(), who: userId, text: message });
    this._taskRepo.save(task);
    this._notify();
    this._audit.addAudit('Добавлен лог задачи', message, 'task', taskId, userId);
  }

  archiveOldTasks(months = 3) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffIso = iso(cutoff);
    let changed = false;
    const all = this._taskRepo.findAll();
    for (const task of all) {
      if (task.archived) continue;
      if ((task.status === 'closed' || task.status === 'cancelled') && task.closedAt && task.closedAt < cutoffIso) {
        task.archived = true;
        task.archivedAt = TODAY;
        this._taskRepo.save(task);
        changed = true;
      }
    }
    if (changed) {
      this._audit.addAudit('Автоматическая архивация задач', `Задачи, закрытые более ${months} мес., перемещены в архив`, null, null, 'system');
      this._notify();
    }
  }

  /**
   * Проход по цепочке родителей вверх. Реальные суммы BudgetService
   * считает «на лету», но флаг isSummary должен быть согласован:
   * любой родитель, у которого появился ребёнок, обязан стать суммарным -
   * иначе UI (TaskModal) отрисует некорректную форму и валидация
   * plannedHours сработает неверно. Заодно защищаемся от циклов.
   */
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
    const task = this._budget.setBudget(taskId, newBudget);
    this._audit.addAudit('Изменение бюджета', `Задача "${task.title}" → ${newBudget} ч`, 'task', taskId, currentUserId);
    this._notify();
    return task;
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
    if (tasks.length > 0) this._notify();
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
    if (tasks.length > 0) this._notify();
  }
}