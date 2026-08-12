import { TODAY, iso, addDays, addMonths, uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES, PROJECT_STATUSES, PROJECT_TYPES, DEPENDENCY_TYPES } from '../utils/constants';
import { ARCHIVE_AFTER_MONTHS, DEADLINE_CHECK_INTERVAL_MS, DEADLINE_CHECK_HOUR_MOSCOW, MAX_LOGIN_ATTEMPTS, ACCOUNT_LOCKOUT_DURATION_MS } from '../utils/config';
import { empName as getEmpName, sanitizeHtml } from '../utils/string';
import { buildMockData } from '../mocks/dataMock';

export default class DataStore {
  constructor(initialData = null) {
    this._data = initialData || buildMockData();
    this._currentUser = null;
    this._listeners = [];
    this._archiveOldTasks(ARCHIVE_AFTER_MONTHS);
    this._scheduleDeadlineCheck();
    this._deadlineIntervalId = null;
  }

  _scheduleDeadlineCheck() {
    const checkAtTime = () => {
      const now = new Date();
      const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
      const targetTime = new Date(moscowTime);
      targetTime.setHours(DEADLINE_CHECK_HOUR_MOSCOW, 0, 0, 0);

      if (moscowTime.getHours() >= DEADLINE_CHECK_HOUR_MOSCOW) {
        targetTime.setDate(targetTime.getDate() + 1);
      }

      const delay = targetTime.getTime() - now.getTime();

      setTimeout(() => {
        this._checkAllDeadlines();
        this._deadlineIntervalId = setInterval(() => this._checkAllDeadlines(), DEADLINE_CHECK_INTERVAL_MS);
      }, delay);
    };

    checkAtTime();
  }

  _cleanupDeadlineCheck() {
    if (this._deadlineIntervalId) {
      clearInterval(this._deadlineIntervalId);
      this._deadlineIntervalId = null;
    }
  }

  _checkAllDeadlines() {
    const now = new Date(TODAY);

    this._data.tasks.forEach(task => {
      if (!task.deadline || ['closed', 'cancelled'].includes(task.status)) return;

      const deadlineDate = new Date(task.deadline);
      const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

      if (daysUntilDeadline === 3 || daysUntilDeadline === 1) {
        const assigneeIds = task.assigneeIds || [];
        assigneeIds.forEach(id => {
          const emp = this._data.employees.find(e => e.id === id);
          if (emp) {
            const daysText = daysUntilDeadline === 1 ? '1 день' : '3 дня';
            const safeTitle = sanitizeHtml(task.title);
            const notifText = `До срока выполнения задачи "${safeTitle}" остался ${daysText}! Срок выполнения: ${task.deadline}`;
            const exists = this._data.notifications.some(n =>
              n.userId === id &&
              n.targetType === 'task' &&
              n.targetId === task.id &&
              n.text === notifText
            );
            if (!exists) {
              this.addNotification(id, notifText, { targetType: 'task', targetId: task.id });
            }
          }
        });
      }
    });
  }

  subscribe(callback) {
    this._listeners.push(callback);
    return () => { this._listeners = this._listeners.filter(cb => cb !== callback); };
  }

  _notify() {
    this._listeners.forEach(cb => cb(this._data));
  }

  get data() { return this._data; }

  setData(newData) {
    if (!newData || typeof newData !== 'object') {
      throw new Error('Invalid data provided to setData');
    }
    this._data = newData;
    this._notify();
  }

  getCurrentUser() { return this._currentUser; }

  login(email, password) {
    const found = this._data.employees.find(e => e.email.toLowerCase() === email.trim().toLowerCase());
    if (found && found.lockUntil && Date.now() < found.lockUntil) {
      const remainingMinutes = Math.ceil((found.lockUntil - Date.now()) / 60000);
      return `Учётная запись заблокирована на ${remainingMinutes} мин. после ${MAX_LOGIN_ATTEMPTS} неудачных попыток входа`;
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
      if (found.failed >= MAX_LOGIN_ATTEMPTS) {
        found.lockUntil = Date.now() + ACCOUNT_LOCKOUT_DURATION_MS;
        this.upsertEmployee(found);
        return `Учётная запись заблокирована на ${ACCOUNT_LOCKOUT_DURATION_MS / 60000} мин. после ${MAX_LOGIN_ATTEMPTS} неудачных попыток входа`;
      }
      this.upsertEmployee(found);
    }
    return 'Неправильно введен логин/пароль';
  }

  logout() {
    this._currentUser = null;
    this._notify();
  }

  _archiveOldTasks(months = ARCHIVE_AFTER_MONTHS) {
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

  // === ЗАДАЧИ ===
  upsertTask(task) {
  const idx = this._data.tasks.findIndex(t => t.id === task.id);
  let tasks;
  let auditMessage = '';

  // Проверка бюджета (без изменений)
  const projectForBudget = this._data.projects.find(p => p.id === task.projectId);
  if (projectForBudget && projectForBudget.budget != null && projectForBudget.ptype !== 'admin' && !projectForBudget.archived) {
    const otherTasksSum = this._data.tasks
      .filter(t => t.projectId === task.projectId && t.id !== task.id)
      .reduce((sum, t) => sum + (t.plannedHours || 0), 0);
    const newTotal = otherTasksSum + (task.plannedHours || 0);
    if (newTotal > projectForBudget.budget) {
      throw new Error(
        `Превышение бюджета проекта! Бюджет: ${projectForBudget.budget} ч, сумма остальных задач: ${otherTasksSum} ч, запрошено: ${task.plannedHours || 0} ч. Требуется увеличение бюджета проекта.`
      );
    }
  }

  if (idx >= 0) {
    const old = this._data.tasks[idx];
    const changes = [];
    if (old.title !== task.title) changes.push(`Название: "${old.title}" → "${task.title}"`);
    if (old.plannedHours !== task.plannedHours) changes.push(`Плановые часы: ${old.plannedHours ?? '—'} → ${task.plannedHours ?? '—'}`);
    if (JSON.stringify(old.assigneeIds) !== JSON.stringify(task.assigneeIds)) {
      changes.push(`Исполнители: ${old.assigneeIds.map(id => this.empName(id)).join(', ')} → ${task.assigneeIds.map(id => this.empName(id)).join(', ')}`);
    }
    if (old.status !== task.status) {
      changes.push(`Статус: ${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[task.status].label}`);

      // ===== ЦЕНТРАЛИЗОВАННАЯ ЛОГИКА УВЕДОМЛЕНИЙ О СМЕНЕ СТАТУСА =====
      const currentUser = this._currentUser;
      const actorName = currentUser ? `${currentUser.last} ${currentUser.first}` : 'Система';

      // 1. Исполнитель отправляет задачу на проверку (inwork → review)
      if (old.status === 'inwork' && task.status === 'review') {
        const assignees = task.assigneeIds || [];
        const project = this._data.projects.find(p => p.id === task.projectId);
        const message = `Задача "${task.title}" отправлена на проверку исполнителем ${actorName}`;

        // Уведомить автора задачи (создателя)
        if (task.creatorId && !assignees.includes(task.creatorId)) {
          this.addNotification(task.creatorId, message, { targetType: 'task', targetId: task.id });
        }
        // Уведомить ответственного по проекту, если он не совпадает с автором и не является исполнителем
        if (project && project.managerId && project.managerId !== task.creatorId && !assignees.includes(project.managerId)) {
          this.addNotification(project.managerId, message, { targetType: 'task', targetId: task.id });
        }
      }

      // 2. Автор/проверяющий возвращает задачу на доработку (review → inwork)
      if (old.status === 'review' && task.status === 'inwork') {
        const assignees = task.assigneeIds || [];
        const message = `Задача "${task.title}" возвращена на доработку пользователем ${actorName}`;

        // Уведомить всех исполнителей
        assignees.forEach(id => {
          if (id !== currentUser?.id) {
            this.addNotification(id, message, { targetType: 'task', targetId: task.id });
          }
        });
        // Уведомить автора, если он не исполнитель и не текущий пользователь
        if (task.creatorId && !assignees.includes(task.creatorId) && task.creatorId !== currentUser?.id) {
          this.addNotification(task.creatorId, message, { targetType: 'task', targetId: task.id });
        }
      }

      // 3. Закрытие/отмена задачи (любой статус → closed/cancelled)
      if ((task.status === 'closed' || task.status === 'cancelled') && old.status !== task.status) {
        task.closedAt = TODAY;
        const assignees = task.assigneeIds || [];
        const message = `Задача "${task.title}" ${task.status === 'closed' ? 'закрыта' : 'отменена'} пользователем ${actorName}`;

        // Уведомить всех исполнителей (кроме текущего)
        assignees.forEach(id => {
          if (id !== currentUser?.id) {
            this.addNotification(id, message, { targetType: 'task', targetId: task.id });
          }
        });
        // Уведомить автора, если он не исполнитель и не текущий пользователь
        if (task.creatorId && !assignees.includes(task.creatorId) && task.creatorId !== currentUser?.id) {
          this.addNotification(task.creatorId, message, { targetType: 'task', targetId: task.id });
        }
        // Уведомить ответственного по проекту, если он не совпадает с автором/исполнителями
        const project = this._data.projects.find(p => p.id === task.projectId);
        if (project && project.managerId && project.managerId !== task.creatorId && !assignees.includes(project.managerId) && project.managerId !== currentUser?.id) {
          this.addNotification(project.managerId, message, { targetType: 'task', targetId: task.id });
        }
      }
    }

    // ... остальные сравнения (dependency и т.д.) без изменений

    if (changes.length > 0) {
      auditMessage = `Изменение задачи "${task.title}": ${changes.join('; ')}`;
      this.addAudit('Изменение задачи', auditMessage, 'task', task.id);
    }
    tasks = this._data.tasks.map(t => t.id === task.id ? task : t);
    this._checkDeadlineNotifications(task, old);
  } else {
    // Создание новой задачи (без изменений)
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
    this._checkDeadlineNotifications(task, null);
  }

  this._data = { ...this._data, tasks };
  this._notify();
  this._archiveOldTasks(ARCHIVE_AFTER_MONTHS);
}

  _checkDeadlineNotifications(task, oldTask) {
    if (!task.deadline || ['closed', 'cancelled'].includes(task.status)) return;

    const now = new Date(TODAY);
    const deadlineDate = new Date(task.deadline);
    const daysUntilDeadline = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    const shouldNotifyThreeDays = daysUntilDeadline === 3;
    const shouldNotifyOneDay = daysUntilDeadline === 1;

    if (!shouldNotifyThreeDays && !shouldNotifyOneDay) return;

    const existingNotif = this._data.notifications.find(n =>
      n.targetType === 'task' &&
      n.targetId === task.id &&
      (n.text.includes('дней до срока выполнения') || n.text.includes('день до срока выполнения'))
    );

    if (existingNotif) return;

    const assigneeIds = task.assigneeIds || [];
    assigneeIds.forEach(id => {
      const emp = this._data.employees.find(e => e.id === id);
      if (emp) {
        const daysText = daysUntilDeadline === 1 ? '1 день' : '3 дня';
        this.addNotification(id, `До срока выполнения задачи "${task.title}" остался ${daysText}! Срок выполнения: ${task.deadline}`, { targetType: 'task', targetId: task.id });
      }
    });
  }

  deleteTask(id) {
    const task = this._data.tasks.find(t => t.id === id);
    if (task) {
      this.addAudit('Удаление задачи', task.title);
    }
    this._data = { ...this._data, tasks: this._data.tasks.filter(t => t.id !== id) };
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
    this._archiveOldTasks(ARCHIVE_AFTER_MONTHS);
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
      const updated = {
        ...t,
        assigneeIds: newAssignees,
        isDelegated: true,
        delegatedFrom: fromId,
        delegatedTo: toId,
        delegationStart: start,
        delegationEnd: end
      };
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
      const updated = {
        ...t,
        assigneeIds: newAssignees,
        isDelegated: false,
        delegatedFrom: null,
        delegatedTo: null,
        delegationStart: null,
        delegationEnd: null
      };
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
      // Слияние: сохраняем все поля старого и обновляем переданными
      const merged = { ...old, ...emp };

      if (JSON.stringify(old.departments) !== JSON.stringify(emp.departments)) {
        this.addAudit('Изменение подразделений', `${emp.last} ${emp.first}: ${old.departments.map(d => d.deptId).join(',')} → ${emp.departments.map(d => d.deptId).join(',')}`);
      }
      if (JSON.stringify(old.roles) !== JSON.stringify(emp.roles)) {
        this.addAudit('Изменение ролей', `${emp.last} ${emp.first}: ${old.roles.join(', ')} → ${emp.roles.join(', ')}`);
      }

      employees = this._data.employees.map(e => e.id === emp.id ? merged : e);

      // Если обновляемый сотрудник — текущий пользователь, обновляем _currentUser
      if (this._currentUser && this._currentUser.id === emp.id) {
        this._currentUser = merged;
      }
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
  addAudit = (action, details, targetType = null, targetId = null) => {
    if (!this._data) {
      console.warn('addAudit called but _data is not initialized');
      return;
    }
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
    if (!userId) return;
    this._data = {
      ...this._data,
      notifications: this._data.notifications.map(n =>
        n.userId === userId ? { ...n, read: true } : n
      )
    };
    this._notify();
  }

  // === ЗАПРОСЫ ===
  addHoursRequest(req) {
    this._data = { ...this._data, hoursRequests: [req, ...this._data.hoursRequests] };
    this._notify();
  }

  approveHoursRequest(requestId, approved) {
    const request = this._data.hoursRequests.find(r => r.id === requestId);
    if (!request) return;

    let updatedData = {
      ...this._data,
      hoursRequests: this._data.hoursRequests.map(r =>
        r.id === requestId ? { ...r, status: approved ? 'approved' : 'rejected' } : r
      )
    };

    if (approved) {
      if (request.kind === 'task') {
        updatedData.tasks = updatedData.tasks.map(t =>
          t.id === request.targetId ? { ...t, plannedHours: request.newH } : t
        );
      } else {
        updatedData.projects = updatedData.projects.map(p =>
          p.id === request.targetId ? { ...p, budget: request.newH } : p
        );
      }
    }

    this._data = updatedData;
    this._notify();
  }

  approveVacation(vacationId, approved, justification = '') {
    const vac = this._data.vacations.find(v => v.id === vacationId);
    if (!vac) return;
    
    const oldStatus = vac.status;
    const newStatus = approved ? 'approved' : 'rejected';
    
    this._data = {
      ...this._data,
      vacations: this._data.vacations.map(v =>
        v.id === vacationId ? { ...v, status: newStatus } : v
      )
    };
    
    // Добавляем запись в аудит с обоснованием
    const empName = this.empName(vac.empId);
    const actionName = approved ? 'Утверждение отпуска' : 'Отклонение отпуска';
    const detailsObj = {
      employee: empName,
      period: `${fmtDMY(vac.start)} — ${fmtDMY(vac.end)}`,
      type: VACATION_TYPES[vac.type],
      oldStatus: oldStatus,
      newStatus: newStatus
    };
    if (justification && justification.trim()) {
      detailsObj.justification = justification.trim();
    }
    this.addAudit(actionName, detailsObj);
    
    // Уведомляем сотрудника
    const msg = approved 
      ? `Ваш отпуск с ${fmtDMY(vac.start)} по ${fmtDMY(vac.end)} утверждён`
      : `Ваш отпуск с ${fmtDMY(vac.start)} по ${fmtDMY(vac.end)} отклонён`;
    this.addNotification(vac.empId, msg, { targetType: 'vacation', targetId: vacationId });
    
    // Если утверждён и время наступило — применяем делегирование
    if (approved && vac.delegation.enabled && vac.start <= TODAY) {
      this.applyDelegation(vacationId);
    }
    
    this._notify();
  }

  approveRoleDelegation(delegationId, approved) {
    const delegation = this._data.roleDelegations.find(r => r.id === delegationId);
    if (!delegation) return;

    // Проверка: только получатель может утвердить/отклонить
    if (delegation.toId !== this._currentUser?.id) {
      throw new Error('Только получатель может подтвердить делегирование');
    }

    // Проверка: не истёк ли срок
    if (delegation.end && new Date(delegation.end) < new Date(TODAY)) {
      throw new Error('Срок действия делегирования истёк');
    }

    this._data = {
      ...this._data,
      roleDelegations: this._data.roleDelegations.map(r =>
        r.id === delegationId ? { ...r, status: approved ? 'active' : 'rejected', approvedAt: approved ? TODAY : null } : r
      )
    };
    
    // Уведомление делегирующему
    const fromName = this.empName(delegation.fromId);
    const toName = this.empName(delegation.toId);
    const rolesStr = delegation.roles.join(', ');
    const msg = approved
      ? `Ваш запрос на передачу ролей (${rolesStr}) пользователю ${toName} принят`
      : `Ваш запрос на передачу ролей (${rolesStr}) пользователю ${toName} отклонён`;
    this.addNotification(delegation.fromId, msg, { targetType: 'delegation', targetId: delegationId });
    
    this._notify();
  }

  /**
   * Отзыв активного делегирования делегировавшим
   * @param {string} delegationId - ID делегирования
   */
  revokeRoleDelegation(delegationId) {
    const delegation = this._data.roleDelegations.find(r => r.id === delegationId);
    if (!delegation) {
      throw new Error('Делегирование не найдено');
    }

    // Проверка: только делегировавший может отозвать
    if (delegation.fromId !== this._currentUser?.id) {
      throw new Error('Только делегировавший может отозвать делегирование');
    }

    // Проверка: можно отозвать только активное
    if (delegation.status !== 'active') {
      throw new Error('Можно отозвать только активное делегирование');
    }

    this._data = {
      ...this._data,
      roleDelegations: this._data.roleDelegations.map(r =>
        r.id === delegationId ? { ...r, status: 'revoked', revokedAt: TODAY, revokedBy: delegation.fromId } : r
      )
    };
    
    // Уведомление получателю
    const fromName = this.empName(delegation.fromId);
    const toName = this.empName(delegation.toId);
    const rolesStr = delegation.roles.join(', ');
    this.addNotification(delegation.toId, `Делегирование ролей (${rolesStr}) от пользователя ${fromName} отозвано`, { targetType: 'delegation', targetId: delegationId });
    
    this.addAudit('Отзыв делегирования ролей', `${fromName} отозвал делегирование ролей (${rolesStr}) у ${toName}`, 'delegation', delegationId);
    
    this._notify();
  }

  approveRegistration(requestId, approved) {
    const request = this._data.regRequests.find(r => r.id === requestId);
    if (!request) return;

    let updatedData = {
      ...this._data,
      regRequests: this._data.regRequests.map(r =>
        r.id === requestId ? { ...r, status: approved ? 'approved' : 'rejected' } : r
      )
    };

    if (approved) {
      const existing = updatedData.employees.find(e => e.email === request.email);
      if (existing) {
        const updated = { ...existing, roles: ['executor'] };
        updatedData.employees = updatedData.employees.map(e =>
          e.id === updated.id ? updated : e
        );
      } else {
        const newEmp = {
          id: 'e_' + Math.random().toString(36).slice(2, 6),
          last: request.last,
          first: request.first,
          email: request.email,
          pass: request.pass,
          position: request.position || 'Сотрудник',
          departments: [],
          roles: ['executor'],
          kbIds: [],
          headDeptIds: [],
          phone: '',
          tab: String(1000 + Math.floor(Math.random() * 8999)),
          notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
          failed: 0,
          lockUntil: 0
        };
        updatedData.employees = [...updatedData.employees, newEmp];
      }
    }

    this._data = updatedData;
    this._notify();
  }

  registerEmployee(regData) {
    const existing = this._data.employees.find(e => e.email.toLowerCase() === regData.email.toLowerCase());
    if (existing) {
      return null;
    }

    const newEmployee = {
      id: 'e_' + uid(),
      last: regData.last.trim(),
      first: regData.first.trim(),
      email: regData.email.trim().toLowerCase(),
      pass: regData.pass,
      position: 'Сотрудник',
      departments: [],
      roles: ['executor'],
      kbIds: [],
      headDeptIds: [],
      phone: '',
      extension: '',
      tab: String(1000 + Math.floor(Math.random() * 8999)),
      notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
      failed: 0,
      lockUntil: 0,
      fired: false,
      photo: null
    };

    this._data = {
      ...this._data,
      employees: [...this._data.employees, newEmployee],
      notifications: [
        { id: uid(), userId: 'sergey.adminov', text: `Новая регистрация: ${newEmployee.last} ${newEmployee.first}`, ts: Date.now(), read: false, targetType: null, targetId: null },
        ...this._data.notifications
      ]
    };
    this._notify();

    return newEmployee;
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

  updateEmployee(emp) {
    const idx = this._data.employees.findIndex(e => e.id === emp.id);
    if (idx < 0) {
      throw new Error(`Сотрудник с ID ${emp.id} не найден`);
    }
    this.upsertEmployee(emp);
    // Явно обновляем _currentUser и уведомляем подписчиков, если это текущий пользователь
    if (this._currentUser && this._currentUser.id === emp.id) {
      const updated = this._data.employees.find(e => e.id === emp.id);
      this._currentUser = updated;
      this._notify();
    }
  }

  createKb(name, full = name) {
    const kb = { id: 'kb_' + Math.random().toString(36).slice(2, 6), name, full };
    this.upsertKb(kb);
    return kb;
  }

  createDepartment(name, kbId = null) {
    const dept = { id: 'd_' + Math.random().toString(36).slice(2, 6), name, kbId };
    this.upsertDepartment(dept);
    return dept;
  }

  deleteVacationById(vacationId) {
    this.deleteVacation(vacationId);
  }

  empName(id) {
    const e = this._data.employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : '—';
  }
}