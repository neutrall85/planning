// src/services/TaskService.js
import { isArchived } from '../utils/entityState';
import { syncExecutorRolesFor } from './roleSync';
import { iso, TODAY, uid, fmtDMY } from '../utils/date';
import {
  dependencyRule,
  deriveLockedValue,
  predecessorDelta,
  shiftDates,
} from '../utils/taskDependency';
import {
  auditDelta,
  auditDetails,
  auditToggle,
  auditListDelta,
  auditHours,
  auditHoursDelta,
  auditLabel,
  auditMark,
  auditName,
  auditValue,
  historyDelta,
} from '../utils/auditHelpers';
import { TASK_STATUSES, PRIORITIES } from '../utils/constants';

export class TaskService {
  constructor({
    taskRepo,
    projectRepo,
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
    this._projectRepo = projectRepo;
    this._employeeRepo = employeeRepo;
    this._budget = budgetService;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
    this._canChangeStatus = canChangeStatus;
    this._canRestore = canRestore;
    this._canRestoreTask = canRestoreTask;
    this._getData = getData;
    this._syncExecutorRoles = (empIds) => syncExecutorRolesFor(empIds, {
      employeeRepo,
      taskRepo,
    });
  }

  getAll() {
    return this._taskRepo.findAll();
  }

  _appendHistory(repo, id, entry) {
    if (!id) return;
    const entity = repo.findById(id);
    if (!entity) return;
    repo.save({ ...entity, history: [...(entity.history || []), entry] });
  }

  _applyDependency(task) {
    if (!task?.dependencyId) return task;
    const predecessor = this._taskRepo.findById(task.dependencyId);
    if (!predecessor) return task;
    const rule = dependencyRule(task.dependencyType);
    if (!rule) return task;
    const value = deriveLockedValue(task.dependencyType, predecessor);
    if (value == null) return task;
    if (task.isHourly) {
      if (task.start === value && task.deadline === value) return task;
      return { ...task, start: value, deadline: value };
    }
    if (task[rule.locked] === value) return task;
    return { ...task, [rule.locked]: value };
  }

  _propagateDependencyShift(before, after, currentUserId, visited = new Set()) {
    if (!before || !after || visited.has(after.id)) return;
    visited.add(after.id);
    const dependents = this._taskRepo.find(
      (t) => t.dependencyId === after.id && !t.archived,
    );
    if (dependents.length === 0) return;
    const ts = Date.now();
    for (const dep of dependents) {
      const delta = predecessorDelta(dep.dependencyType, before, after);
      if (!delta) continue;
      const shifted = shiftDates(dep, delta);
      const sign = delta > 0 ? '+' : '';
      shifted.history = [
        ...(shifted.history || []),
        {
          ts,
          who: currentUserId,
          text: `Даты сдвинуты на ${sign}${delta} дн. вследствие изменения «${after.title}»`,
        },
      ];
      this._taskRepo.save(shifted);
      this._propagateDependencyShift(dep, shifted, currentUserId, visited);
    }
  }

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
      if (!(user && this._canChangeStatus(user, existing, task.status, this._getData()))) {
        throw new Error('Переход в этот статус не разрешён для вашей роли');
      }
    }

    if (task.logs && Array.isArray(task.logs)) {
      task.actualHours = task.logs.reduce((sum, log) => sum + (log.hours || 0), 0);
    } else {
      task.actualHours = 0;
    }

    task = this._applyDependency(task);

    // Новая summary-задача: бюджета ещё нет, инициализируем из плана.
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
        const remaining = this._budget.getEffectiveRemaining(task.parentTaskId, excludeId);
        throw new Error(
          `Невозможно добавить/обновить подзадачу в ${parentName}: ` +
          `доступно ${remaining !== null ? remaining : 'неизвестно'} ч, ` +
          `запрошено ${planned} ч.`,
        );
      }
    }

    if (!isNew) {
      // Summary-задача — это не только флаг isSummary, но и фактическое
      // наличие потомков. В данных может быть задача с детьми, но без
      // флага (например, если задача стала родителем «на ходу», через
      // создание подзадачи). Для бюджета важна фактическая структура.
      const hasChildren = this._taskRepo.findChildren(task.id).length > 0;
      const functionallySummary = task.isSummary || hasChildren;

      if (functionallySummary) {
        /**
         * Изменение «Плановых часов» у summary-задачи.
         *
         * Для summary-задачи plannedHours и budgetHours — это одна и
         * та же величина: сколько часов можно распределить на
         * собственные logs и на подзадачи. Держать их синхронно —
         * единственный способ не путать пользователя и не терять
         * изменения.
         *
         * Правило:
         *   1. Пользователь не менял значение → оставляем как было
         *      (budgetHours = existing.budgetHours ?? plannedHours,
         *      plannedHours = existing.plannedHours).
         *   2. Пользователь изменил → новый бюджет не может быть
         *      меньше уже занятого (собственные logs + планы потомков,
         *      которые BudgetService считает по листьям, без двойного
         *      счёта промежуточных узлов). Если меньше — бросаем с
         *      числами и понятным текстом. Если проходит — применяем
         *      одновременно к budgetHours и plannedHours.
         *
         * Раньше здесь был молчаливый откат:
         *     task.plannedHours = existing.plannedHours;
         *     task.budgetHours = existing.budgetHours ?? existing.plannedHours;
         * Пользователь менял поле, нажимал «Сохранить», значение
         * возвращалось к старому без каких-либо сообщений. Это и был
         * баг «часы не меняются».
         */
        const newBudgetRaw = parseFloat(task.plannedHours);
        const oldBudget = parseFloat(
          existing.budgetHours ?? existing.plannedHours ?? NaN,
        );

        if (!Number.isFinite(newBudgetRaw)) {
          // plannedHours пустой или NaN — оставляем прежние значения,
          // форму не переписываем. Такое может прийти, если форма
          // отдала пустоту вместо числа.
          task.plannedHours = existing.plannedHours;
          task.budgetHours = existing.budgetHours;
        } else if (newBudgetRaw === oldBudget) {
          // Не менялось — синхронизируем без проверок.
          task.plannedHours = existing.plannedHours;
          task.budgetHours = existing.budgetHours ?? existing.plannedHours ?? 0;
        } else {
          // Меняется: проверяем, что новый бюджет не меньше занятого.
          // «Занятое» считаем через остаток: occupied = oldBudget − remaining.
          // Это честнее, чем собирать ownActual и descendantsPlan вручную:
          // getRemainingHours уже учитывает правила (листья vs
          // промежуточные узлы), и дублировать их здесь не нужно.
          const remaining = this._budget.getRemainingHours(existing.id);
          const occupied = Number.isFinite(remaining)
            ? oldBudget - remaining
            : 0;

          if (newBudgetRaw < occupied) {
            throw new Error(
              `Новый бюджет (${newBudgetRaw} ч) меньше занятого: ` +
              `${occupied} ч (собственные логи + планы подзадач). ` +
              `Уменьшите планы подзадач или увеличьте значение.`,
            );
          }

          task.plannedHours = newBudgetRaw;
          task.budgetHours = newBudgetRaw;
        }
      } else if (task.plannedHours != null) {
        // Обычная (не summary) задача: план — это просто план.
        // Проверяем только, что он не меньше суммы планов уже
        // существующих подзадач (детей быть не должно по условию, но
        // проверка бесплатна и защищает от повреждённых данных).
        const sumChildren = this._taskRepo
          .findChildren(task.id)
          .reduce((acc, t) => acc + (parseFloat(t.plannedHours) || 0), 0);
        if (sumChildren > parseFloat(task.plannedHours)) {
          throw new Error(
            `Сумма плановых часов подзадач (${sumChildren} ч) превышает ` +
            `новый план задачи "${task.title}" (${task.plannedHours} ч).`,
          );
        }
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
      if (!task.createdAt) {
        task.createdAt = new Date().toISOString();
      }
    }

    if (isRestore) {
      task.history = [
        ...(task.history || []),
        { ts: Date.now(), who: currentUserId, text: 'Восстановлена из архива' },
      ];
    } else if (isNew && task.parentTaskId) {
      const parent = this._taskRepo.findById(task.parentTaskId);
      if (parent) {
        task.history = [
          ...(task.history || []),
          { ts: Date.now(), who: currentUserId, text: `Создана как подзадача: «${parent.title}»` },
        ];
      }
    } else if (!isNew) {
      const entries = this._historyEntries(existing, task);
      if (entries.length > 0) {
        const ts = Date.now();
        task.history = [
          ...(task.history || []),
          ...entries.map((text) => ({ ts, who: currentUserId, text })),
        ];
      }
    }

    if (task.parentTaskId) {
      const parent = this._taskRepo.findById(task.parentTaskId);
      if (parent) {
        let parentChanged = false;
        if (!parent.isSummary) {
          parent.isSummary = true;
          if (parent.budgetHours === undefined || parent.budgetHours === null) {
            parent.budgetHours = parent.plannedHours || 0;
          }
          parentChanged = true;
        }
        if (isNew) {
          parent.history = [
            ...(parent.history || []),
            { ts: Date.now(), who: currentUserId, text: `Добавлена подзадача: «${task.title}»` },
          ];
          parentChanged = true;
        }
        if (parentChanged) this._taskRepo.save(parent);
      }
    }

    if (isNew && !task.parentTaskId && task.projectId) {
      this._appendHistory(this._projectRepo, task.projectId, {
        ts: Date.now(),
        who: currentUserId,
        text: `Создана задача: «${task.title}»`,
      });
    }

    if (!isNew && existing.projectId !== task.projectId) {
      const ts = Date.now();
      if (existing.projectId) {
        this._appendHistory(this._projectRepo, existing.projectId, {
          ts,
          who: currentUserId,
          text: `Задача перемещена в другой проект: «${task.title}»`,
        });
      }
      if (task.projectId) {
        this._appendHistory(this._projectRepo, task.projectId, {
          ts,
          who: currentUserId,
          text: `Задача перемещена из другого проекта: «${task.title}»`,
        });
      }
    }

    this._taskRepo.save(task);

    if (!isNew) this._propagateDependencyShift(existing, task, currentUserId);

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

    let updated = { ...existing, ...patch };
    if (patch.logs) {
      updated.actualHours = patch.logs.reduce((s, l) => s + (l.hours || 0), 0);
    }
    updated = this._applyDependency(updated);

    const entries = this._historyEntries(existing, updated);
    if (entries.length > 0) {
      const ts = Date.now();
      updated.history = [
        ...(updated.history || []),
        ...entries.map((text) => ({ ts, who: currentUserId, text })),
      ];
    }

    this._taskRepo.save(updated);
    this._propagateDependencyShift(existing, updated, currentUserId);

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

    // Для summary-задачи plannedHours и budgetHours — одна и та же
    // величина, но в diff хочется видеть человекочитаемую строку
    // «Бюджет задачи». Обычная задача пишет plannedHours как раньше.
    if (existing.isSummary) {
      auditDelta(
        changes,
        'Бюджет задачи',
        existing.budgetHours ?? existing.plannedHours,
        next.budgetHours ?? next.plannedHours,
        (v) => (v == null ? '—' : `${v} ч`),
      );
    } else {
      auditDelta(changes, 'Плановые часы', existing.plannedHours, next.plannedHours);
    }

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

  _historyEntries(existing, next) {
    const entries = [];
    const employeeName = (id) => auditName(this._employeeRepo, id);
    const projectCode = (id) => {
      if (!id) return '—';
      return ((this._getData?.() || {}).projects || []).find((p) => p.id === id)?.code || id;
    };
    const taskTitle = (id) => {
      if (!id) return '—';
      return this._taskRepo.findById(id)?.title || id;
    };

    historyDelta(entries, 'Исполнитель', existing.assigneeId, next.assigneeId, employeeName);
    historyDelta(entries, 'Срок', existing.deadline, next.deadline);
    historyDelta(entries, 'Дата начала', existing.start, next.start);
    historyDelta(entries, 'Приоритет', existing.priority, next.priority, (v) => auditLabel(PRIORITIES, v));
    historyDelta(entries, 'Проект', existing.projectId, next.projectId, projectCode);

    if (next.isSummary) {
      // Для summary-задачи в history пишем «Бюджет задачи», чтобы
      // изменение бюджета отличалось от изменения плана обычной
      // задачи и читалось в контексте.
      historyDelta(
        entries,
        'Бюджет задачи',
        existing.budgetHours ?? existing.plannedHours,
        next.budgetHours ?? next.plannedHours,
        auditHours,
      );
    } else {
      historyDelta(entries, 'Плановые часы', existing.plannedHours, next.plannedHours, auditHours);
    }

    if (existing.parentTaskId !== next.parentTaskId) {
      if (!existing.parentTaskId && next.parentTaskId) {
        entries.push(`Назначена подзадачей: «${taskTitle(next.parentTaskId)}»`);
      } else if (existing.parentTaskId && !next.parentTaskId) {
        entries.push(`Откреплена от родительской задачи «${taskTitle(existing.parentTaskId)}»`);
      } else {
        entries.push(
          `Родительская задача: «${taskTitle(existing.parentTaskId)}» → «${taskTitle(next.parentTaskId)}»`,
        );
      }
    }
    if (!!existing.isHourly !== !!next.isHourly) {
      entries.push(next.isHourly ? 'Режим часовой задачи включён' : 'Режим часовой задачи выключен');
    }
    return entries;
  }

  deleteTask(id, currentUserId) {
    const task = this._taskRepo.findById(id);
    if (task && isArchived(task)) throw new Error('Задача в архиве - удаление запрещено');
    if (task) this._audit.addAudit('Удаление задачи', task.title, 'task', id, currentUserId);

    const parentId = task?.parentTaskId;
    const projectId = task?.projectId;
    const affectedAssigneeId = task?.assigneeId;

    const children = this._taskRepo.findChildren(id);
    for (const child of children) {
      child.parentTaskId = null;
      this._taskRepo.save(child);
    }

    this._taskRepo.delete(id);

    if (task && !task.parentTaskId && projectId) {
      this._appendHistory(this._projectRepo, projectId, {
        ts: Date.now(),
        who: currentUserId,
        text: `Удалена задача: «${task.title}»`,
      });
    }

    if (parentId && task) {
      const parent = this._taskRepo.findById(parentId);
      if (parent) {
        parent.history = [
          ...(parent.history || []),
          { ts: Date.now(), who: currentUserId, text: `Удалена подзадача: «${task.title}»` },
        ];
        // Если подзадач больше не осталось — снимаем флаг summary и
        // очищаем budgetHours. plannedHours оставляем как есть: это
        // «первоначальный план», он всё ещё осмыслен.
        if (this._taskRepo.findChildren(parentId).length === 0) {
          parent.isSummary = false;
          parent.budgetHours = null;
        }
        this._taskRepo.save(parent);
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
    if (!title && !text) throw new Error('Заметка не может быть пустой');

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
      const idx = list.findIndex((n) => n.id === noteData.id);
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
    if (task.assigneeId !== empId) throw new Error('Удалять можно только свои заметки');
    const notes = { ...(task.notes || {}) };
    const list = Array.isArray(notes[empId])
      ? notes[empId].filter((n) => n.id !== noteId)
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
      if (
        (task.status === 'closed' || task.status === 'cancelled') &&
        task.closedAt &&
        task.closedAt < cutoffIso
      ) {
        task.archived = true;
        task.archivedAt = TODAY;
        this._taskRepo.save(task);
        if (task.assigneeId) affectedEmpIds.add(task.assigneeId);
        changed = true;
      }
    }
    if (changed) {
      if (affectedEmpIds.size) this._syncExecutorRoles(affectedEmpIds);
      this._audit.addAudit(
        'Автоматическая архивация задач',
        `Задачи, закрытые более ${months} мес., перемещены в архив`,
        null,
        null,
        'system',
      );
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

  getRemainingHours(taskId) {
    return this._budget.getRemainingHours(taskId);
  }

  setBudget(taskId, newBudget, currentUserId) {
    const task = this._taskRepo.findById(taskId);
    if (task && isArchived(task)) throw new Error('Задача в архиве - редактирование запрещено');
    const oldBudget = task?.budgetHours ?? task?.plannedHours;
    const updated = this._budget.setBudget(taskId, newBudget);
    updated.history = [
      ...(updated.history || []),
      { ts: Date.now(), who: currentUserId, text: `План: ${auditHours(oldBudget)} → ${auditHours(newBudget)}` },
    ];
    this._taskRepo.save(updated);
    this._audit.addAudit(
      'Изменение плановых часов задачи',
      { Задача: updated.title, План: `${auditValue(oldBudget)} → ${newBudget}` },
      'task',
      taskId,
      currentUserId,
    );
    this._notify();
    return updated;
  }

  applyDelegation(fromId, toId, start, end, statuses) {
    const tasks = this._taskRepo
      .findByAssignee(fromId)
      .filter((t) => !t.archived && statuses.includes(t.status) && (!t.deadline || t.deadline >= start));
    for (const task of tasks) {
      task.assigneeId = toId;
      task.history = task.history || [];
      const fromName = this._employeeRepo.findById(fromId)?.last || 'сотрудник';
      const toName = this._employeeRepo.findById(toId)?.last || 'сотрудник';
      task.history.push({
        ts: Date.now(),
        who: 'system',
        text: `Задача переназначена с ${fromName} на ${toName} на период отпуска с ${fmtDMY(start)} по ${fmtDMY(end)}`,
      });
      this._taskRepo.save(task);
    }
    if (tasks.length > 0) {
      this._syncExecutorRoles([fromId, toId]);
      this._notify();
    }
  }

  revertDelegation(fromId, toId) {
    const tasks = this._taskRepo
      .findByAssignee(toId)
      .filter(
        (t) =>
          !t.archived &&
          t.history &&
          t.history.some((h) =>
            h.text.includes(`переназначена с ${this._employeeRepo.findById(fromId)?.last || ''}`),
          ),
      );
    for (const task of tasks) {
      task.assigneeId = fromId;
      task.history.push({
        ts: Date.now(),
        who: 'system',
        text: `Задача возвращена ${this._employeeRepo.findById(fromId)?.last || 'сотруднику'} по окончании отпуска`,
      });
      this._taskRepo.save(task);
    }
    if (tasks.length > 0) {
      this._syncExecutorRoles([fromId, toId]);
      this._notify();
    }
  }
}