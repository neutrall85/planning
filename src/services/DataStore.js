import { TODAY, iso, addDays, addMonths, uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES, PROJECT_STATUSES, PROJECT_TYPES, DEPENDENCY_TYPES } from '../utils/constants';
import { buildMockData } from './mockData';

export default class DataStore {
  constructor() {
    this._data = buildMockData();
    this._currentUser = null;
    this._listeners = [];
    this._archiveOldTasks(3);
  }

  subscribe(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(cb => cb !== callback); };
  }
  _notify() {
    this._listeners.forEach(cb => cb(this._data));
  }

  get data() { return this._data; }
  getCurrentUser() { return this._currentUser; }

  login(email, password) {
    const found = this._data.employees.find(e => e.email.toLowerCase() === email.trim().toLowerCase());
    if (found && found.lockUntil && Date.now() < found.lockUntil) {
      const remainingMinutes = Math.ceil((found.lockUntil - Date.now()) / 60000);
      return `Учётная запись заблокирована на ${remainingMinutes} мин. после 5 неудачных попыток входа`;
    }
    if (found && found.pass === password && !found.fired) {
      if (found.failed > 0) {
        found.failed = 0;
        found.lockUntil = 0;
        this.upsertEmployee(found);
      }
      this._currentUser = found;
      this._notify();
      return true;
    }
    if (found) {
      found.failed = (found.failed || 0) + 1;
      if (found.failed >= 5) {
        found.lockUntil = Date.now() + 15 * 60 * 1000;
        this.upsertEmployee(found);
        return 'Учётная запись заблокирована на 15 мин. после 5 неудачных попыток входа';
      }
      this.upsertEmployee(found);
    }
    return 'Неправильно введен логин/пароль';
  }

  logout() {
    this._currentUser = null;
    this._notify();
  }

  _archiveOldTasks(months = 3) {
    const cutoff = addMonths(new Date(), -months);
    const cutoffIso = iso(cutoff);
    let changed = false;
    this._data.tasks = this._data.tasks.map(t => {
      if (t.archived) return t;
      if ((t.status === 'closed' || t.status === 'cancelled') && t.closedAt && t.closedAt < cutoffIso) {
        changed = true;
        return { ...t, archived: true, archivedAt: TODAY };
      }
      return t;
    });
    if (changed) {
      this._notify();
      this.addAudit('Автоматическая архивация задач', `Задачи, закрытые более ${months} мес., перемещены в архив`);
    }
  }

  // === Рекурсивный подсчёт плановых часов для суммарной задачи ===
  _calcSummaryHours(taskId, visited = new Set()) {
    if (visited.has(taskId)) return 0; // защита от циклов
    visited.add(taskId);

    const task = this._data.tasks.find(t => t.id === taskId);
    if (!task) return 0;
    if (!task.isSummary) return task.plannedHours || 0;

    const children = this._data.tasks.filter(t => t.parentTaskId === taskId && !t.archived);
    let sum = 0;
    for (const child of children) {
      sum += this._calcSummaryHours(child.id, visited);
    }
    return sum;
  }

  // === Пересчёт часов для задачи и всех её родителей ===
  _recalcSummaryHoursChain(taskId) {
    let current = this._data.tasks.find(t => t.id === taskId);
    while (current) {
      if (current.isSummary) {
        const newHours = this._calcSummaryHours(current.id);
        // Обновляем plannedHours только если изменилось
        if (current.plannedHours !== newHours) {
          current.plannedHours = newHours;
          const idx = this._data.tasks.findIndex(t => t.id === current.id);
          if (idx !== -1) {
            this._data.tasks[idx] = { ...current };
          }
        }
      }
      // Поднимаемся к родителю
      if (current.parentTaskId) {
        current = this._data.tasks.find(t => t.id === current.parentTaskId);
      } else {
        break;
      }
    }
  }

  // === ЗАДАЧИ (с проверкой бюджета) ===
  upsertTask(task) {
    const idx = this._data.tasks.findIndex(t => t.id === task.id);
    let tasks;
    let auditMessage = '';

    // ПРОВЕРКА БЮДЖЕТА (только для производственных проектов)
    const projectForBudget = this._data.projects.find(p => p.id === task.projectId);
    if (projectForBudget && projectForBudget.budget != null && projectForBudget.ptype !== 'admin' && !projectForBudget.archived) {
      const otherTasksSum = this._data.tasks
        .filter(t => t.projectId === task.projectId && t.id !== task.id)
        .reduce((sum, t) => sum + (t.plannedHours || 0), 0);
      const newTotal = otherTasksSum + (task.plannedHours || 0);
      if (newTotal > projectForBudget.budget) {
        throw new Error(
          `Превышение бюджета проекта! Бюджет: ${projectForBudget.budget} ч, сумма остальных задач: ${otherTasksSum} ч, запрошено: ${task.plannedHours || 0} ч.`
        );
      }
    }

    // Если это новая задача и указан родитель
    if (idx === -1 && task.parentTaskId) {
        const parent = this._data.tasks.find(t => t.id === task.parentTaskId);
        if (parent) {
            if (!task.projectId) task.projectId = parent.projectId;
        } else {
            task.parentTaskId = null;
        }
    }

    if (idx >= 0) {
      const old = this._data.tasks[idx];
      const changes = [];
      if (old.title !== task.title) changes.push(`Название: "${old.title}" → "${task.title}"`);
      
      // Для суммарных задач plannedHours вычисляется автоматически, не сравниваем
      if (!task.isSummary && old.plannedHours !== task.plannedHours) {
        changes.push(`Плановые часы: ${old.plannedHours ?? '—'} → ${task.plannedHours ?? '—'}`);
      }
      if (JSON.stringify(old.assigneeIds) !== JSON.stringify(task.assigneeIds)) {
        changes.push(`Исполнители: ${old.assigneeIds.map(id => this.empName(id)).join(', ')} → ${task.assigneeIds.map(id => this.empName(id)).join(', ')}`);
      }
      if (old.status !== task.status) {
        changes.push(`Статус: ${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[task.status].label}`);
        if ((task.status === 'closed' || task.status === 'cancelled') && old.status !== task.status) {
          task.closedAt = TODAY;
          if (task.creatorId) {
            this.addNotification(task.creatorId, `Задача "${task.title}" ${task.status === 'closed' ? 'закрыта' : 'отменена'}`, { targetType: 'task', targetId: task.id });
          }
          const project = this._data.projects.find(p => p.id === task.projectId);
          if (project && project.managerId && project.managerId !== task.creatorId) {
            this.addNotification(project.managerId, `Задача "${task.title}" проекта ${project.code} ${task.status === 'closed' ? 'закрыта' : 'отменена'}`, { targetType: 'task', targetId: task.id });
          }
        }
      }
      // Логирование изменений зависимостей
      if (old.dependencyId !== task.dependencyId || old.dependencyType !== task.dependencyType) {
        const oldDep = old.dependencyId ? this._data.tasks.find(t => t.id === old.dependencyId) : null;
        const newDep = task.dependencyId ? this._data.tasks.find(t => t.id === task.dependencyId) : null;
        const depTypeLabel = task.dependencyType ? DEPENDENCY_TYPES[task.dependencyType]?.label : '';
        const oldDepStr = oldDep ? `"${oldDep.title}" (${DEPENDENCY_TYPES[old.dependencyType]?.label || 'FS'})` : 'нет';
        const newDepStr = newDep ? `"${newDep.title}" (${depTypeLabel})` : 'нет';
        changes.push(`Зависимость: ${oldDepStr} → ${newDepStr}`);
      }
      if (changes.length > 0) {
        auditMessage = `Изменение задачи "${task.title}": ${changes.join('; ')}`;
        this.addAudit('Изменение задачи', auditMessage, 'task', task.id);
      }
      tasks = this._data.tasks.map(t => t.id === task.id ? task : t);
    } else {
      if (!task.createdAt) {
        task.createdAt = new Date().toISOString();
      }
      tasks = [...this._data.tasks, task];
      this.addAudit('Создание задачи', task.title, 'task', task.id);
      (task.assigneeIds || []).forEach(id => {
        if (id !== this._currentUser?.id) {
          this.addNotification(id, `Вам назначена задача "${task.title}"`, { targetType: 'task', targetId: task.id });
        }
      });
    }

    this._data = { ...this._data, tasks };
    
    // Пересчёт часов для родительских суммарных задач
    const taskId = task.id;
    if (task.parentTaskId) {
      this._recalcSummaryHoursChain(task.parentTaskId);
    }
    // Если у задачи изменился флаг isSummary или parentTaskId, пересчитываем её саму и её родителей
    // Для новой задачи – пересчёт уже сделан выше для родителей, но если isSummary=true, нужно посчитать её собственные часы
    if (task.isSummary) {
      this._recalcSummaryHoursChain(taskId);
    }

    this._notify();
    this._archiveOldTasks(3);
  }

  deleteTask(id) {
    const task = this._data.tasks.find(t => t.id === id);
    if (task) {
      this.addAudit('Удаление задачи', task.title);
    }

    const parentId = task?.parentTaskId;

    // Если удаляемая задача была родительской – сбросим parentTaskId у всех её подзадач
    this._data.tasks = this._data.tasks.map(t => {
      if (t.parentTaskId === id) {
        return { ...t, parentTaskId: null };
      }
      return t;
    });

    this._data = { ...this._data, tasks: this._data.tasks.filter(t => t.id !== id) };
    
    // Пересчёт часов для родительской суммарной задачи
    if (parentId) {
      this._recalcSummaryHoursChain(parentId);
    }

    this._notify();
  }

  // === ПРОЕКТЫ ===
  upsertProject(project) {
    const idx = this._data.projects.findIndex(p => p.id === project.id);
    let projects;
    let auditMessage = '';
    if (idx >= 0) {
      const oldProject = this._data.projects[idx];
      const changes = [];
      if (oldProject.name !== project.name) changes.push(`Название: "${oldProject.name}" → "${project.name}"`);
      if (oldProject.code !== project.code) changes.push(`Код: "${oldProject.code}" → "${project.code}"`);
      if (oldProject.budget !== project.budget) changes.push(`Бюджет: ${oldProject.budget ?? '—'} → ${project.budget ?? '—'}`);
      if (oldProject.status !== project.status) {
        changes.push(`Статус: ${PROJECT_STATUSES[oldProject.status]} → ${PROJECT_STATUSES[project.status]}`);
        if ((project.status === 'closed' || project.status === 'cancelled') && oldProject.status !== project.status) {
          project.archived = true;
          project.archivedAt = TODAY;
          this._data.tasks = this._data.tasks.map(t => {
            if (t.projectId === project.id) {
              const updated = { ...t, archived: true, archivedAt: TODAY };
              if (t.creatorId) {
                this.addNotification(t.creatorId, `Задача "${t.title}" проекта ${project.code} архивирована (проект закрыт)`, { targetType: 'task', targetId: t.id });
              }
              return updated;
            }
            return t;
          });
          this.addNotification(project.managerId || 'system', `Проект "${project.name}" архивирован`, { targetType: 'project', targetId: project.id });
        }
      }
      if (changes.length > 0) {
        auditMessage = `Изменение проекта "${project.name}": ${changes.join('; ')}`;
        this.addAudit('Изменение проекта', auditMessage, 'project', project.id);
      }
      projects = this._data.projects.map(p => p.id === project.id ? project : p);
    } else {
      projects = [...this._data.projects, project];
      this.addAudit('Создание проекта', project.name, 'project', project.id);
    }
    this._data = { ...this._data, projects };
    this._notify();
    this._archiveOldTasks(3);
  }

  deleteProject(id) {
    const project = this._data.projects.find(p => p.id === id);
    if (project) {
      this.addAudit('Удаление проекта', project.name);
    }
    this._data = {
      ...this._data,
      projects: this._data.projects.filter(p => p.id !== id),
      tasks: this._data.tasks.filter(t => t.projectId !== id)
    };
    this._notify();
  }

  // === ОТПУСКА ===
  upsertVacation(vac) {
    const idx = this._data.vacations.findIndex(v => v.id === vac.id);
    let vacations;
    if (idx >= 0) {
      const old = this._data.vacations[idx];
      this.addAudit('Изменение отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`);
      vacations = this._data.vacations.map(v => v.id === vac.id ? vac : v);
    } else {
      vacations = [...this._data.vacations, vac];
      this.addAudit('Создание отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`);
    }
    this._data = { ...this._data, vacations };
    this._notify();
    if (vac.delegation.enabled && vac.status === 'approved' && vac.start <= TODAY) {
      this.applyDelegation(vac.id);
    }
  }

  deleteVacation(id) {
    const vac = this._data.vacations.find(v => v.id === id);
    if (vac) {
      this.addAudit('Удаление отпуска', `${vac.empId} ${fmtDMY(vac.start)}—${fmtDMY(vac.end)}`);
      if (vac.delegation.enabled) {
        this.revertDelegation(id);
      }
    }
    this._data = { ...this._data, vacations: this._data.vacations.filter(v => v.id !== id) };
    this._notify();
  }

  applyDelegation(vacationId) {
    const vac = this._data.vacations.find(v => v.id === vacationId);
    if (!vac || !vac.delegation.enabled || vac.status !== 'approved') return;
    const start = vac.start;
    const end = vac.end;
    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    const statuses = vac.delegation.statuses.length ? vac.delegation.statuses : ['new', 'inwork', 'review'];
    this._data.tasks = this._data.tasks.map(t => {
      if (t.archived) return t;
      if (!t.assigneeIds.includes(fromId)) return t;
      if (!statuses.includes(t.status)) return t;
      if (t.deadline && t.deadline < start) return t;
      const newAssignees = t.assigneeIds.filter(id => id !== fromId);
      if (!newAssignees.includes(toId)) newAssignees.push(toId);
      const updated = { ...t, assigneeIds: newAssignees };
      updated.history = [...updated.history, {
        ts: Date.now(),
        who: 'system',
        text: `Задача переназначена с ${this.empName(fromId)} на ${this.empName(toId)} на период отпуска с ${fmtDMY(start)} по ${fmtDMY(end)}`
      }];
      return updated;
    });
    this._notify();
    this.addNotification(toId, `Вам переданы задачи ${this.empName(fromId)} на время отпуска`, { targetType: 'vacation', targetId: vacationId });
    this.addNotification(fromId, `Ваши задачи переданы ${this.empName(toId)} на период отпуска`, { targetType: 'vacation', targetId: vacationId });
  }

  revertDelegation(vacationId) {
    const vac = this._data.vacations.find(v => v.id === vacationId);
    if (!vac || !vac.delegation.enabled) return;
    const fromId = vac.empId;
    const toId = vac.delegation.subId;
    this._data.tasks = this._data.tasks.map(t => {
      if (t.archived) return t;
      if (!t.assigneeIds.includes(toId)) return t;
      const hasDelegation = t.history.some(h => h.text.includes(`переназначена с ${this.empName(fromId)} на ${this.empName(toId)}`));
      if (!hasDelegation) return t;
      const newAssignees = t.assigneeIds.filter(id => id !== toId);
      if (!newAssignees.includes(fromId)) newAssignees.push(fromId);
      const updated = { ...t, assigneeIds: newAssignees };
      updated.history = [...updated.history, {
        ts: Date.now(),
        who: 'system',
        text: `Задача возвращена ${this.empName(fromId)} по окончании отпуска`
      }];
      return updated;
    });
    this._notify();
    this.addNotification(fromId, `Задачи возвращены вам по окончании отпуска`, { targetType: 'vacation', targetId: vacationId });
  }

  // === СОТРУДНИКИ ===
  upsertEmployee(emp) {
    const idx = this._data.employees.findIndex(e => e.id === emp.id);
    let employees;
    if (idx >= 0) {
      const old = this._data.employees[idx];
      if (JSON.stringify(old.departments) !== JSON.stringify(emp.departments)) {
        this.addAudit('Изменение подразделений', `${emp.last} ${emp.first}: ${old.departments.map(d => d.deptId).join(',')} → ${emp.departments.map(d => d.deptId).join(',')}`);
      }
      if (JSON.stringify(old.roles) !== JSON.stringify(emp.roles)) {
        this.addAudit('Изменение ролей', `${emp.last} ${emp.first}: ${old.roles.join(', ')} → ${emp.roles.join(', ')}`);
      }
      employees = this._data.employees.map(e => e.id === emp.id ? emp : e);
    } else {
      employees = [...this._data.employees, emp];
      this.addAudit('Создание сотрудника', `${emp.last} ${emp.first}`);
    }
    this._data = { ...this._data, employees };
    this._notify();
  }

  upsertDepartment(dept) {
    const idx = this._data.departments.findIndex(d => d.id === dept.id);
    let departments;
    if (idx >= 0) {
      departments = this._data.departments.map(d => d.id === dept.id ? dept : d);
    } else {
      departments = [...this._data.departments, dept];
      this.addAudit('Создание отдела', dept.name);
    }
    this._data = { ...this._data, departments };
    this._notify();
  }

  upsertKb(kb) {
    const idx = this._data.kbs.findIndex(k => k.id === kb.id);
    let kbs;
    if (idx >= 0) {
      kbs = this._data.kbs.map(k => k.id === kb.id ? kb : k);
    } else {
      kbs = [...this._data.kbs, kb];
      this.addAudit('Создание КБ', kb.name);
    }
    this._data = { ...this._data, kbs };
    this._notify();
  }

  // === АУДИТ И УВЕДОМЛЕНИЯ ===
  addAudit(action, details, targetType = null, targetId = null) {
    let detailsStr = details;
    if (typeof details === 'object') {
      detailsStr = JSON.stringify(details);
    }
    this._data = {
      ...this._data,
      audit: [
        {
          id: uid(),
          ts: Date.now(),
          userId: this._currentUser?.id || "system",
          action,
          details: detailsStr,
          targetType,
          targetId,
        },
        ...this._data.audit
      ]
    };
    this._notify();
  }

  addNotification(userId, text, target = null) {
    this._data = {
      ...this._data,
      notifications: [
        { id: uid(), userId, text, ts: Date.now(), read: false, targetType: target?.targetType || null, targetId: target?.targetId || null },
        ...this._data.notifications
      ]
    };
    this._notify();
  }

  markNotificationRead(id) {
    this._data = {
      ...this._data,
      notifications: this._data.notifications.map(n => n.id === id ? { ...n, read: true } : n)
    };
    this._notify();
  }

  markAllNotificationsRead(userId) {
    this._data = {
      ...this._data,
      notifications: this._data.notifications.map(n => n.userId === userId ? { ...n, read: true } : n)
    };
    this._notify();
  }

  // === ЗАПРОСЫ ===
  addHoursRequest(req) {
    this._data = { ...this._data, hoursRequests: [req, ...this._data.hoursRequests] };
    this._notify();
  }

  upsertRoleDelegation(rd) {
    const idx = this._data.roleDelegations.findIndex(r => r.id === rd.id);
    let roleDelegations;
    if (idx >= 0) {
      roleDelegations = this._data.roleDelegations.map(r => r.id === rd.id ? rd : r);
    } else {
      roleDelegations = [...this._data.roleDelegations, rd];
      this.addAudit('Создание делегирования ролей', `${rd.fromId} → ${rd.toId}: ${rd.roles.join(', ')}`);
    }
    this._data = { ...this._data, roleDelegations };
    this._notify();
  }

  empName(id) {
    const e = this._data.employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : '—';
  }
}