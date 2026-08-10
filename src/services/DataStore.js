import { TODAY, iso, addDays, addMonths, uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES, PROJECT_STATUSES, PROJECT_TYPES, DEPENDENCY_TYPES } from '../utils/constants';

export default class DataStore {
  constructor() {
    this._data = this._buildMock();
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
    this._notify();
    this._archiveOldTasks(3);
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

  // === МОКОВЫЕ ДАННЫЕ (полные) ===
  _buildMock() {
    const D = (off) => iso(addDays(new Date(), off));
    const now = Date.now();
    const makeDate = (daysOffset) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return iso(d);
    };

    const settings = { archiveMonths: 6 };

    const kbs = [
      { id: "kb_la", name: "КБ «ЛА»", full: "Конструкторское бюро летательных аппаратов" },
      { id: "kb_ad", name: "КБ «АД»", full: "Конструкторское бюро авиационных двигателей" },
    ];

    const departments = [
      { id: "d_aero", name: "Отдел аэродинамики", kbId: "kb_la" },
      { id: "d_strla", name: "Отдел прочности", kbId: "kb_la" },
      { id: "d_comp", name: "Отдел компоновки и весовых балансов", kbId: "kb_la" },
      { id: "d_gas", name: "Отдел газодинамики", kbId: "kb_ad" },
      { id: "d_stren", name: "Отдел прочности двигателей", kbId: "kb_ad" },
      { id: "d_sau", name: "Отдел систем автоматического управления", kbId: "kb_ad" },
      { id: "d_av1", name: "Отдел бортового радиоэлектронного оборудования (ОБРЭО)", kbId: "kb_la" },
      { id: "d_otk", name: "Отдел контроля качества инженерного центра", kbId: null },
      { id: "d_hr", name: "Отдел управления персоналом", kbId: null },
      { id: "d_management", name: "Группа управления и развития", kbId: null },
    ];

    // Полный список сотрудников
    const employees = [
      { id: "sergey.adminov", last: "Админов", first: "Сергей", email: "sergey.adminov", pass: "Admin2026!", position: "Администратор системы", departments: [{ deptId: "d_otk", primary: true }], roles: ["admin"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "101", tab: "1001", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "aleksey.gendirov", last: "Гендиров", first: "Алексей", email: "aleksey.gendirov", pass: "Director2026!", position: "Генеральный директор", departments: [], roles: ["director"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "102", tab: "1002", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "erik.ekonomistov", last: "Экономистов", first: "Эрик", email: "erik.ekonomistov", pass: "Econ2026!", position: "Главный экономист", departments: [{ deptId: "d_management", primary: true }], roles: ["economist"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "103", tab: "1003", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "ivan.konstruktorov", last: "Конструкторов", first: "Иван", email: "ivan.konstruktorov", pass: "KbLa2026!", position: "Главный конструктор КБ «ЛА»", departments: [{ deptId: "d_aero", primary: true }], roles: ["kb_chief", "executor"], kbIds: ["kb_la"], headDeptIds: [], phone: "+7 900 000-00-00", extension: "104", tab: "1004", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_belova", last: "Белова", first: "Наталья", email: "belova", pass: "KbAd2026!", position: "Главный конструктор КБ «АД»", departments: [{ deptId: "d_gas", primary: true }], roles: ["kb_chief", "executor"], kbIds: ["kb_ad"], headDeptIds: [], phone: "+7 900 000-00-00", extension: "105", tab: "1005", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "olga.personalova", last: "Персоналова", first: "Ольга", email: "olga.personalova", pass: "Hr2026!", position: "Руководитель отдела управления персоналом", departments: [{ deptId: "d_hr", primary: true }], roles: ["hr", "head", "executor"], kbIds: [], headDeptIds: ["d_hr"], phone: "+7 900 000-00-00", extension: "106", tab: "1006", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "mikhail.otdelov", last: "Отделов", first: "Михаил", email: "mikhail.otdelov", pass: "Head2026!", position: "Начальник отдела аэродинамики", departments: [{ deptId: "d_aero", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_aero", "d_comp"], phone: "+7 900 000-00-00", extension: "107", tab: "1007", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "kirill.proektov", last: "Проектов", first: "Кирилл", email: "kirill.proektov", pass: "Pm2026!", position: "Ответственный по проекту", departments: [{ deptId: "d_aero", primary: true }], roles: ["project_lead", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "116", tab: "1016", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "nikolay.managerov", last: "Менеджеров", first: "Николай", email: "nikolay.managerov", pass: "Pm2026!", position: "Менеджер проектов", departments: [{ deptId: "d_av1", primary: true }], roles: ["project_manager", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "117", tab: "1017", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_otk_head", last: "Отков", first: "Олег", email: "otk.head", pass: "Head2026!", position: "Руководитель отдела контроля качества", departments: [{ deptId: "d_otk", primary: true }], roles: ["head", "executor"], kbIds: [], headDeptIds: ["d_otk"], phone: "+7 900 000-00-00", extension: "201", tab: "2001", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_otk_spec", last: "Специалистов", first: "Сергей", email: "otk.spec", pass: "Exec2026!", position: "Специалист по контролю качества", departments: [{ deptId: "d_otk", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "202", tab: "2002", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "isaev", last: "Исаев", first: "Роман", email: "isaev", pass: "Exec2026!", position: "Инженер-аэродинамик", departments: [{ deptId: "d_aero", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "118", tab: "1018", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_romanov", last: "Романов", first: "Владимир", email: "romanov", pass: "KbLa2026!", position: "Главный конструктор КБ «ЛА»", departments: [{ deptId: "d_aero", primary: true }], roles: ["kb_chief", "executor"], kbIds: ["kb_la"], headDeptIds: [], phone: "+7 900 000-00-00", extension: "104", tab: "1004", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_fedorov", last: "Фёдоров", first: "Игорь", email: "fedorov", pass: "Head2026!", position: "Начальник отдела аэродинамики", departments: [{ deptId: "d_aero", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_aero", "d_comp"], phone: "+7 900 000-00-00", extension: "107", tab: "1007", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_gromov", last: "Громов", first: "Сергей", email: "gromov", pass: "Head2026!", position: "Начальник отдела прочности", departments: [{ deptId: "d_strla", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_strla"], phone: "+7 900 000-00-00", extension: "108", tab: "1008", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_ilina", last: "Ильина", first: "Анна", email: "ilina", pass: "Exec2026!", position: "Ведущий инженер-компоновщик", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "109", tab: "1009", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_krylov", last: "Крылов", first: "Виктор", email: "krylov", pass: "Head2026!", position: "Начальник отдела газодинамики", departments: [{ deptId: "d_gas", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_gas"], phone: "+7 900 000-00-00", extension: "110", tab: "1010", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_medvedev", last: "Медведев", first: "Павел", email: "medvedev", pass: "Head2026!", position: "Начальник отдела прочности двигателей", departments: [{ deptId: "d_stren", primary: true }], roles: ["head", "executor", "project_lead"], kbIds: [], headDeptIds: ["d_stren"], phone: "+7 900 000-00-00", extension: "111", tab: "1011", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_orlova", last: "Орлова", first: "Елена", email: "orlova", pass: "Head2026!", position: "Начальник отдела САУ", departments: [{ deptId: "d_sau", primary: true }], roles: ["head", "executor"], kbIds: [], headDeptIds: ["d_sau"], phone: "+7 900 000-00-00", extension: "112", tab: "1012", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_morozov", last: "Морозов", first: "Константин", email: "morozov", pass: "Pm2026!", position: "Ведущий инженер", departments: [{ deptId: "d_aero", primary: true }], roles: ["project_lead", "executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "116", tab: "1016", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_zaitsev", last: "Зайцев", first: "Алексей", email: "zaitsev", pass: "Exec2026!", position: "Инженер по прочности", departments: [{ deptId: "d_strla", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "119", tab: "1019", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_frolova", last: "Фролова", first: "Дарья", email: "frolova", pass: "Exec2026!", position: "Инженер-расчётчик", departments: [{ deptId: "d_strla", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "120", tab: "1020", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_tolka", last: "Толкачёва", first: "Ирина", email: "tolkacheva", pass: "Exec2026!", position: "Инженер-конструктор", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "121", tab: "1021", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_gusev", last: "Гусев", first: "Максим", email: "gusev", pass: "Exec2026!", position: "Инженер по весам", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "122", tab: "1022", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_tihonov", last: "Тихонов", first: "Егор", email: "tihonov", pass: "Exec2026!", position: "Инженер-газодинамик", departments: [{ deptId: "d_gas", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "123", tab: "1023", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_melnik", last: "Мельник", first: "Светлана", email: "melnik", pass: "Exec2026!", position: "Инженер по ресурсу", departments: [{ deptId: "d_stren", primary: true }, { deptId: "d_gas", primary: false }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "124", tab: "1024", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_koval", last: "Ковальчук", first: "Пётр", email: "kovalchuk", pass: "Exec2026!", position: "Инженер-программист САУ", departments: [{ deptId: "d_sau", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "125", tab: "1025", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_somova", last: "Сомова", first: "Екатерина", email: "somova", pass: "Exec2026!", position: "Инженер-конструктор", departments: [{ deptId: "d_comp", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "126", tab: "1026", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
      { id: "e_anokhin", last: "Анохин", first: "Сергей", email: "anokhin", pass: "Exec2026!", position: "Инженер по ОБРЭО", departments: [{ deptId: "d_av1", primary: true }], roles: ["executor"], kbIds: [], headDeptIds: [], phone: "+7 900 000-00-00", extension: "127", tab: "1027", notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null },
    ];

    // Полный список проектов (все с полями customer, aircraftType, projectType, stage, comments, history, files)
    const projects = [
      {
        id: "p_lm24",
        code: "ЛМ-24",
        name: "Лёгкий многоцелевой самолёт ЛМ-24",
        desc: "ОКР по созданию лёгкого многоцелевого самолёта.",
        kbId: "kb_la",
        managerId: "e_morozov",
        start: D(-25),
        end: D(50),
        status: "active",
        budget: 300,
        ptype: "prod",
        category: "NORM",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "Минобороны РФ",
        aircraftType: "Су-57",
        projectType: "Модификация",
        stage: "Рабочая документация",
        comments: [],
        history: [{ ts: Date.now() - 86400000*10, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_cert",
        code: "СЕРТ-24",
        name: "Сертификация самолёта ЛМ-24",
        desc: "Комплекс сертификационных работ.",
        kbId: "kb_la",
        managerId: "e_fedorov",
        start: D(-10),
        end: D(45),
        status: "active",
        budget: 90,
        ptype: "prod",
        category: "CRIT",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "Росавиация",
        aircraftType: "Су-57",
        projectType: "Модификация",
        stage: "Испытания",
        comments: [],
        history: [{ ts: Date.now() - 86400000*9, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_heli",
        code: "В-112",
        name: "Модернизация вертолёта В-112",
        desc: "Модернизация планера и систем.",
        kbId: "kb_la",
        managerId: "e_gromov",
        start: D(-30),
        end: D(35),
        status: "active",
        budget: 120,
        ptype: "prod",
        category: "AOG",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "ВКС РФ",
        aircraftType: "Ка-52",
        projectType: "Ремонт",
        stage: "Изготовление",
        comments: [],
        history: [{ ts: Date.now() - 86400000*8, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_rd900",
        code: "РД-900",
        name: "Турбовинтовой двигатель РД-900",
        desc: "Перспективный ТВД.",
        kbId: "kb_ad",
        managerId: "e_krylov",
        start: D(-20),
        end: D(60),
        status: "active",
        budget: 200,
        ptype: "prod",
        category: "NORM",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "ОАК",
        aircraftType: "Ил-76",
        projectType: "Модификация",
        stage: "Эскизный проект",
        comments: [],
        history: [{ ts: Date.now() - 86400000*7, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_apu",
        code: "ВСУ-14",
        name: "Вспомогательная силовая установка ВСУ-14",
        desc: "ВСУ для ЛМ-24.",
        kbId: "kb_ad",
        managerId: "e_medvedev",
        start: D(-12),
        end: D(30),
        status: "active",
        budget: 70,
        ptype: "prod",
        category: "CRIT",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "Минобороны РФ",
        aircraftType: "Су-57",
        projectType: "Ремонт",
        stage: "Рабочая документация",
        comments: [],
        history: [{ ts: Date.now() - 86400000*6, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_obr",
        code: "ОБРЭО-01",
        name: "Модернизация бортового оборудования",
        desc: "Замена аналоговых систем на цифровые.",
        kbId: null,
        managerId: "nikolay.managerov",
        start: D(-5),
        end: D(20),
        status: "active",
        budget: 150,
        ptype: "prod",
        category: "NORM",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "nikolay.managerov",
        customer: "Ростех",
        aircraftType: "МиГ-35",
        projectType: "Модификация",
        stage: "Эскизный проект",
        comments: [],
        history: [{ ts: Date.now() - 86400000*5, who: "nikolay.managerov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_event",
        code: "АДМ-1",
        name: "Внутренние мероприятия предприятия",
        desc: "Административный проект: организационные работы и мероприятия.",
        kbId: null,
        managerId: "",
        start: D(-5),
        end: null,
        status: "active",
        budget: null,
        ptype: "admin",
        category: null,
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "АО «АэроПлан»",
        aircraftType: "Другой",
        projectType: "Модификация",
        stage: "Сдача",
        comments: [],
        history: [{ ts: Date.now() - 86400000*4, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_old",
        code: "ИТ-15",
        name: "Модернизация локальной сети предприятия",
        desc: "Проект завершён более полугода назад — подлежит архивации.",
        kbId: null,
        managerId: "e_morozov",
        start: D(-300),
        end: D(-230),
        status: "closed",
        budget: 120,
        ptype: "prod",
        category: "NORM",
        archived: true,
        archivedAt: D(-215),
        closedAt: D(-215),
        creatorId: "aleksey.gendirov",
        customer: "АО «АэроПлан»",
        aircraftType: "Другой",
        projectType: "Ремонт",
        stage: "Сдача",
        comments: [],
        history: [{ ts: Date.now() - 86400000*300, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_long",
        code: "АДМ-0",
        name: "Многолетняя программа внутренних мероприятий",
        desc: "Долгосрочный административный проект — исключение из архивации.",
        kbId: null,
        managerId: "olga.personalova",
        start: D(-400),
        end: null,
        status: "closed",
        budget: null,
        ptype: "admin",
        category: null,
        longterm: true,
        archived: false,
        archivedAt: null,
        closedAt: D(-300),
        creatorId: "aleksey.gendirov",
        customer: "АО «АэроПлан»",
        aircraftType: "Другой",
        projectType: "Модификация",
        stage: "Сдача",
        comments: [],
        history: [{ ts: Date.now() - 86400000*400, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_aero",
        code: "АЭРО-24",
        name: "Аэродинамические исследования ЛМ-24",
        desc: "Исследования аэродинамических характеристик самолёта.",
        kbId: "kb_la",
        managerId: "mikhail.otdelov",
        start: D(-10),
        end: D(30),
        status: "active",
        budget: 80,
        ptype: "prod",
        category: "NORM",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "Минобороны РФ",
        aircraftType: "Су-57",
        projectType: "Модификация",
        stage: "Испытания",
        comments: [],
        history: [{ ts: Date.now() - 86400000*3, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_proch",
        code: "ПРОЧ-24",
        name: "Прочностные испытания планера",
        desc: "Статические и усталостные испытания.",
        kbId: "kb_la",
        managerId: "e_gromov",
        start: D(-5),
        end: D(20),
        status: "active",
        budget: 100,
        ptype: "prod",
        category: "AOG",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "ВКС РФ",
        aircraftType: "Су-57",
        projectType: "Модификация",
        stage: "Изготовление",
        comments: [],
        history: [{ ts: Date.now() - 86400000*2, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_sau",
        code: "САУ-24",
        name: "Система управления двигателем РД-900",
        desc: "Разработка цифровой системы управления.",
        kbId: "kb_ad",
        managerId: "e_orlova",
        start: D(-2),
        end: D(25),
        status: "active",
        budget: 120,
        ptype: "prod",
        category: "NORM",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "ОАК",
        aircraftType: "Ил-76",
        projectType: "Модификация",
        stage: "Эскизный проект",
        comments: [],
        history: [{ ts: Date.now() - 86400000*1, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_obr_sw",
        code: "ОБРЭО-ПО",
        name: "Разработка ПО для ОБРЭО",
        desc: "Программное обеспечение для бортового оборудования.",
        kbId: "kb_la",
        managerId: "nikolay.managerov",
        start: D(0),
        end: D(30),
        status: "active",
        budget: 90,
        ptype: "prod",
        category: "CRIT",
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "nikolay.managerov",
        customer: "Ростех",
        aircraftType: "МиГ-35",
        projectType: "Модификация",
        stage: "Рабочая документация",
        comments: [],
        history: [{ ts: Date.now(), who: "nikolay.managerov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_portal",
        code: "ПОРТ-24",
        name: "Внутренний портал сотрудника",
        desc: "Административный проект по созданию портала.",
        kbId: null,
        managerId: "olga.personalova",
        start: D(-20),
        end: D(40),
        status: "active",
        budget: null,
        ptype: "admin",
        category: null,
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "АО «АэроПлан»",
        aircraftType: "Другой",
        projectType: "Модификация",
        stage: "Эскизный проект",
        comments: [],
        history: [{ ts: Date.now() - 86400000*2, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
      {
        id: "p_bp",
        code: "БП-24",
        name: "Оптимизация бизнес-процессов",
        desc: "Анализ и оптимизация процессов.",
        kbId: null,
        managerId: "erik.ekonomistov",
        start: D(-15),
        end: D(15),
        status: "active",
        budget: null,
        ptype: "admin",
        category: null,
        archived: false,
        archivedAt: null,
        closedAt: null,
        creatorId: "aleksey.gendirov",
        customer: "АО «АэроПлан»",
        aircraftType: "Другой",
        projectType: "Модификация",
        stage: "Рабочая документация",
        comments: [],
        history: [{ ts: Date.now() - 86400000*1, who: "aleksey.gendirov", text: "Проект создан" }],
        files: [],
      },
    ];

    // Полный список задач (с разбросом дат)
    const T = (id, title, projectId, assigneeIds, planned, s, dl, status, priority, desc, extra = {}) => {
      const history = extra.history || [{ ts: now - 86400000 * 6, who: extra.creatorId || "aleksey.gendirov", text: "Задача создана" }];
      const creatorId = extra.creatorId || (history.length > 0 ? history[0].who : "aleksey.gendirov");
      const startDate = makeDate(s);
      const deadlineDate = dl !== null ? makeDate(dl) : null;
      const createdAtDate = new Date(startDate);
      createdAtDate.setDate(createdAtDate.getDate() + Math.floor(Math.random() * 11) - 5);
      const createdAtStr = createdAtDate.toISOString();
      return {
        id, title, desc: desc || "", projectId, assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : [assigneeIds],
        plannedHours: planned, start: startDate, deadline: deadlineDate,
        status, priority, logs: [], comments: [], history,
        creatorId,
        createdAt: extra.createdAt || createdAtStr,
        delegatedFrom: null, archived: false, archivedAt: null, closedAt: null, ...extra,
      };
    };

    // Задачи (все 35+ штук)
    const tasks = [
      T("t01", "Расчёт подъёмной силы крыла", "p_lm24", ["isaev"], 24, -12, 6, "inwork", "high", "Расчёт и оформление отчёта.", { logs: [ { id: uid(), userId: "isaev", date: makeDate(-6), hours: 6, note: "Проверка методики" }, { id: uid(), userId: "isaev", date: makeDate(-2), hours: 5, note: "Расчётная сетка" } ], comments: [ { id: "c1", parentId: null, authorId: "e_morozov", ts: now - 3600000 * 20, text: "@Исаев Роман — подключите, пожалуйста, отдел прочности к пятнице." }, { id: "c2", parentId: "c1", authorId: "isaev", ts: now - 3600000 * 18, text: "Принято, сегодня подготовлю исходные данные." } ], creatorId: "e_morozov" }),
      T("t02", "3D-модель фюзеляжа", "p_lm24", ["e_tolka"], 40, -15, 12, "inwork", "mid", "Силовой набор и обводы.", { logs: [ { id: uid(), userId: "e_tolka", date: makeDate(-5), hours: 8, note: "Шпангоуты" } ], creatorId: "e_morozov" }),
      T("t03", "Нагрузки на элероны", "p_lm24", ["e_zaitsev"], 16, -10, -2, "new", "crit", "Эпюры нагрузок для навесок.", { creatorId: "e_morozov" }),
      T("t04", "Отчёт по прочности фюзеляжа", "p_lm24", ["e_frolova"], 32, -8, 18, "review", "high", "Статика и усталость.", { logs: [ { id: uid(), userId: "e_frolova", date: makeDate(-3), hours: 12, note: "МКЭ-модель" } ], creatorId: "e_morozov" }),
      T("t05", "Весовая сводка компоновки", "p_lm24", ["e_gusev"], 20, -5, 9, "inwork", "mid", "", { logs: [ { id: uid(), userId: "e_gusev", date: makeDate(-1), hours: 4, note: "Сведение таблиц" } ], creatorId: "e_morozov" }),
      T("t06", "Программа лётных испытаний", "p_cert", ["e_fedorov"], 16, -2, 25, "new", "mid", "Совместно с лётной службой.", { creatorId: "e_fedorov" }),
      T("t07", "Согласование плана статиспытаний", "p_cert", ["e_anokhin"], 12, -4, 4, "inwork", "high", "", { logs: [ { id: uid(), userId: "e_anokhin", date: makeDate(-2), hours: 3, note: "Замечания" } ], creatorId: "e_fedorov" }),
      T("t08", "Чертежи лопастей несущего винта", "p_heli", ["e_somova"], 36, -18, 20, "inwork", "high", "Переназначено на период отпуска Сомовой.", { delegatedFrom: "e_somova", logs: [ { id: uid(), userId: "e_somova", date: makeDate(-7), hours: 10, note: "Комлевая часть" } ], creatorId: "e_gromov" }),
      T("t09", "Вибрационный расчёт главного редуктора", "p_heli", ["isaev"], 18, -6, 14, "new", "mid", "", { creatorId: "e_gromov" }),
      T("t10", "Термогазодинамический расчёт компрессора", "p_rd900", ["e_tihonov"], 48, -14, 28, "inwork", "crit", "Режимы взлёт/крейсер.", { logs: [ { id: uid(), userId: "e_tihonov", date: makeDate(-4), hours: 12, note: "Характеристики ступеней" } ], creatorId: "e_krylov" }),
      T("t11", "Прочность камеры сгорания", "p_rd900", ["e_medvedev"], 30, -9, 22, "inwork", "mid", "", { logs: [ { id: uid(), userId: "e_medvedev", date: makeDate(-3), hours: 6, note: "Теплонапряжённость" } ], creatorId: "e_krylov" }),
      T("t12", "ТЗ на САУ-900", "p_rd900", ["e_orlova"], 20, -7, 10, "review", "mid", "", { logs: [ { id: uid(), userId: "e_orlova", date: makeDate(-2), hours: 8, note: "Разделы 3–5" } ], creatorId: "e_krylov" }),
      T("t13", "Компрессор ВСУ-14", "p_apu", ["e_tihonov"], 22, -4, 16, "new", "mid", "", { creatorId: "e_medvedev" }),
      T("t14", "Испытания стартер-генератора ВСУ", "p_apu", ["e_gusev"], 14, -12, -4, "inwork", "high", "Стенд №3, протокол.", { logs: [ { id: uid(), userId: "e_gusev", date: makeDate(-6), hours: 6, note: "Прогон на стенде" } ], creatorId: "e_medvedev" }),
      T("t15", "Разработка ТЗ на новое радиооборудование", "p_obr", ["e_anokhin"], 30, -3, 15, "inwork", "high", "Требования к дальности и помехозащищённости.", { creatorId: "nikolay.managerov" }),
      T("t16", "Тестирование прототипа приемника", "p_obr", ["e_anokhin"], 20, 2, 18, "new", "mid", "", { creatorId: "nikolay.managerov" }),
      T("t17", "Интеграция с бортовой шиной", "p_obr", ["e_anokhin"], 24, 5, 25, "new", "mid", "", { creatorId: "nikolay.managerov" }),
      T("t18", "Подготовка зала ко Дню промышленности", "p_event", ["olga.personalova"], null, 0, 6, "new", "mid", "", { creatorId: "olga.personalova" }),
      T("t19", "Заказать сувенирную продукцию", "p_event", ["olga.personalova"], 6, 1, 10, "new", "low", "", { creatorId: "olga.personalova" }),
      T("t_a1", "Монтаж оборудования точек доступа", "p_old", ["e_anokhin"], 30, -290, -240, "closed", "mid", "Завершено в прошлом отчётном периоде.", { logs: [ { id: uid(), userId: "e_anokhin", date: makeDate(-250), hours: 28, note: "Монтаж и пусконаладка" } ], closedAt: D(-215), comments: [ { id: "ca1", parentId: null, authorId: "e_morozov", ts: now - 86400000 * 220, text: "Прошу зафиксировать итоговую схему размещения точек." }, { id: "ca2", parentId: "ca1", authorId: "e_anokhin", ts: now - 86400000 * 218, text: "Схема приложена к отчёту, всё смонтировано." } ], creatorId: "e_morozov" }),
      T("t_a2", "Аудит сетевых кабелей", "p_old", ["e_morozov"], 18, -280, -235, "closed", "low", "", { logs: [ { id: uid(), userId: "e_morozov", date: makeDate(-240), hours: 16, note: "Аудит завершён" } ], closedAt: D(-220), creatorId: "e_morozov" }),
      T("t_a3", "Подготовка регламента мероприятий", "p_long", ["olga.personalova"], 10, -320, -305, "closed", "low", "Задача долгосрочного административного проекта — не архивируется.", { logs: [ { id: uid(), userId: "olga.personalova", date: makeDate(-310), hours: 9, note: "Регламент готов" } ], closedAt: D(-300), creatorId: "olga.personalova" }),
      T("t20", "Аудит качества сборки", "p_lm24", ["sergey.adminov"], 12, -8, 5, "new", "high", "Проверка соответствия технологии."),
      T("t21", "Утверждение стратегии развития", "p_bp", ["aleksey.gendirov"], 8, -5, 10, "new", "high", "Подготовка и утверждение стратегии."),
      T("t22", "Анализ бюджетов проектов", "p_bp", ["erik.ekonomistov"], 16, -3, 12, "inwork", "mid", "Сравнение плановых и фактических затрат.", { logs: [ { id: uid(), userId: "erik.ekonomistov", date: makeDate(-2), hours: 8, note: "Сбор данных" } ] }),
      T("t23", "Руководство проектированием крыла", "p_lm24", ["ivan.konstruktorov"], 20, -10, 15, "inwork", "crit", "Общее руководство конструкторской группой."),
      T("t24", "Расчёт газодинамики двигателя", "p_rd900", ["e_belova"], 30, -12, 20, "new", "high", "Расчёт параметров рабочего процесса."),
      T("t25", "Координация аэродинамических расчётов", "p_aero", ["mikhail.otdelov"], 18, -5, 10, "inwork", "mid", "Сведение результатов.", { logs: [ { id: uid(), userId: "mikhail.otdelov", date: makeDate(-2), hours: 6, note: "Совещание" } ] }),
      T("t26", "Планирование испытаний", "p_cert", ["kirill.proektov"], 14, -4, 8, "new", "mid", "Разработка программы испытаний."),
      T("t27", "Управление проектом ОБРЭО", "p_obr", ["nikolay.managerov"], 24, -3, 15, "inwork", "high", "Координация работ по проекту.", { logs: [ { id: uid(), userId: "nikolay.managerov", date: makeDate(-1), hours: 6, note: "План-график" } ] }),
      T("t28", "Контроль качества сборки", "p_lm24", ["e_otk_head"], 16, -6, 4, "new", "high", "Входной контроль комплектующих."),
      T("t29", "Проверка документации", "p_lm24", ["e_otk_spec"], 12, -4, 2, "new", "mid", "Проверка конструкторской документации."),
      T("t30", "Расчёт конструкции фюзеляжа", "p_lm24", ["e_romanov"], 28, -14, 12, "inwork", "mid", "Проектирование силового набора.", { logs: [ { id: uid(), userId: "e_romanov", date: makeDate(-5), hours: 10, note: "Выбор материалов" } ] }),
      T("t31", "Термогазодинамика РД-900", "p_rd900", ["e_krylov"], 26, -10, 18, "inwork", "crit", "Термодинамические расчёты.", { logs: [ { id: uid(), userId: "e_krylov", date: makeDate(-3), hours: 12, note: "Моделирование" } ] }),
      T("t32", "Планирование прочностных испытаний", "p_proch", ["e_gromov"], 14, -2, 6, "new", "mid", "План испытаний планера."),
      T("t33", "Компоновка отсеков", "p_lm24", ["e_ilina"], 20, -8, 10, "inwork", "mid", "Размещение оборудования.", { logs: [ { id: uid(), userId: "e_ilina", date: makeDate(-1), hours: 4, note: "Эскизы" } ] }),
      T("t34", "Программирование САУ", "p_sau", ["e_koval"], 40, -6, 20, "new", "high", "Разработка ПО для управления двигателем."),
      T("t35", "Расчёт ресурса лопаток", "p_rd900", ["e_melnik"], 24, -9, 14, "inwork", "mid", "Усталостный расчёт.", { logs: [ { id: uid(), userId: "e_melnik", date: makeDate(-4), hours: 10, note: "Нагрузки" } ] }),
    ];

    // Отпуска
    const vacations = [
      { id: "v1", empId: "e_somova", start: D(-2), end: D(5), type: "annual", comment: "Отдых, Сочи", status: "approved", delegation: { enabled: true, subId: "e_anokhin", statuses: ["inwork", "review"], state: "applied" } },
      { id: "v2", empId: "e_tihonov", start: D(3), end: D(14), type: "annual", comment: "Плановый отпуск", status: "pending", delegation: { enabled: true, subId: "e_melnik", statuses: ["inwork"], state: null } },
      { id: "v3", empId: "e_gusev", start: D(-20), end: D(-8), type: "sick", comment: "Больничный лист", status: "approved", delegation: { enabled: false, subId: null, statuses: [], state: null } },
      { id: "v4", empId: "isaev", start: D(10), end: D(17), type: "annual", comment: "Отпуск", status: "pending", delegation: { enabled: false, subId: null, statuses: [], state: null } },
      { id: "v5", empId: "e_anokhin", start: D(-15), end: D(-3), type: "annual", comment: "Уже был", status: "approved", delegation: { enabled: false, subId: null, statuses: [], state: null } },
    ];

    // Запросы на изменение часов
    const hoursRequests = [
      { id: "hr1", kind: "task", targetId: "t04", oldH: 32, newH: 48, reason: "Добавился расчёт усталостных трещин по требованию ОТК.", reqId: "e_morozov", status: "pending", ts: now - 3600000 * 5 },
      { id: "hr2", kind: "project", targetId: "p_lm24", oldH: 180, newH: 210, reason: "Расширение scope: добавлены работы по сертификации.", reqId: "e_morozov", status: "pending", ts: now - 3600000 * 20 },
    ];

    // Заявки на регистрацию
    const regRequests = [
      { id: "rg1", first: "Олег", last: "Новиков", email: "novikov", pass: "Exec2026!", status: "pending", ts: now - 3600000 * 26 },
    ];

    // Уведомления
    const notifications = [
      { id: uid(), userId: "aleksey.gendirov", text: "Запрос на изменение плановых часов по задаче «Отчёт по прочности фюзеляжа» ожидает решения.", ts: now - 3600000 * 5, read: false, targetType: 'hours', targetId: 'hr1' },
      { id: uid(), userId: "e_fedorov", text: "Тихонов Е. подал заявку на отпуск с делегированием задач — требуется утверждение.", ts: now - 3600000 * 8, read: false, targetType: 'vacation', targetId: 'v2' },
      { id: uid(), userId: "e_anokhin", text: "Вам переданы задачи Сомовой Е. на период отпуска.", ts: now - 3600000 * 30, read: false, targetType: 'task', targetId: 't08' },
      { id: uid(), userId: "nikolay.managerov", text: "Новая заявка на регистрацию: Новиков Олег.", ts: now - 3600000 * 26, read: false, targetType: 'registration', targetId: 'rg1' },
    ];

    // Аудит
    const audit = [
      { id: uid(), ts: now - 86400000 * 2, userId: "e_morozov", action: "Запрос изменения часов", details: "t04: 32 → 48 ч" },
      { id: uid(), ts: now - 86400000 * 3, userId: "e_morozov", action: "Утверждено делегирование отпуска", details: "Сомова Е. → Анохин С." },
      { id: uid(), ts: now - 86400000 * 6, userId: "nikolay.managerov", action: "Создан проект", details: "ОБРЭО-01" },
    ];

    return { settings, kbs, departments, employees, projects, tasks, vacations, hoursRequests, roleDelegations: [], regRequests, notifications, audit };
  }
}