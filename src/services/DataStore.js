import { TODAY, iso, addDays, addMonths, uid, fmtDMY } from '../utils/date';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES, VACATION_TYPES, PROJECT_STATUSES, PROJECT_TYPES } from '../utils/constants';

export default class DataStore {
  constructor() {
    this._data = this._buildMock();
    this._currentUser = null;
    this._listeners = [];
    // При инициализации архивируем задачи, закрытые более 3 месяцев назад
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

  // ––– Архивация старых задач (вызывается после каждой мутации) –––
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

  // ––– Мутации –––
  upsertTask(task) {
    const idx = this._data.tasks.findIndex(t => t.id === task.id);
    let tasks;
    let auditMessage = '';
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
      if (changes.length > 0) {
        auditMessage = `Изменение задачи "${task.title}": ${changes.join('; ')}`;
        this.addAudit('Изменение задачи', auditMessage);
      }
      tasks = this._data.tasks.map(t => t.id === task.id ? task : t);
    } else {
      tasks = [...this._data.tasks, task];
      this.addAudit('Создание задачи', task.title);
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

  upsertProject(project) {
    const idx = this._data.projects.findIndex(p => p.id === project.id);
    let projects;
    let auditMessage = '';
    if (idx >= 0) {
      const oldProject = this._data.projects[idx];
      const changes = [];
      if (oldProject.name !== project.name) changes.push(`Название: "${oldProject.name}" → "${project.name}"`);
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
        this.addAudit('Изменение проекта', auditMessage);
      }
      projects = this._data.projects.map(p => p.id === project.id ? project : p);
    } else {
      projects = [...this._data.projects, project];
      this.addAudit('Создание проекта', project.name);
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

  // ––– Делегирование задач при отпуске –––
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

  // ––– Управление сотрудниками –––
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

  addAudit(action, details) {
    this._data = {
      ...this._data,
      audit: [
        { id: uid(), ts: Date.now(), userId: this._currentUser?.id || "system", action, details },
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

  // ––– Утилиты –––
  empName(id) {
    const e = this._data.employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : '—';
  }

  // ––– Моковые данные –––
  _buildMock() {
    const D = (off) => iso(addDays(new Date(), off));
    const settings = { archiveMonths: 6 };
    const kbs = [
      { id: "kb_la", name: "КБ «ЛА»", full: "Конструкторское бюро летательных аппаратов" },
      { id: "kb_ad", name: "КБ «АД»", full: "Конструкторское бюро авиационных двигателей" },
      { id: "kb_av", name: "КБ «АО»", full: "Конструкторское бюро авионики и оборудования" },
    ];
    const departments = [
      { id: "d_mgmt", name: "Дирекция", kbId: null },
      { id: "d_aero", name: "Отдел аэродинамики", kbId: "kb_la" },
      { id: "d_strla", name: "Отдел прочности", kbId: "kb_la" },
      { id: "d_comp", name: "Отдел компоновки и весовых балансов", kbId: "kb_la" },
      { id: "d_gas", name: "Отдел газодинамики", kbId: "kb_ad" },
      { id: "d_stren", name: "Отдел прочности двигателей", kbId: "kb_ad" },
      { id: "d_sau", name: "Отдел систем автоматического управления", kbId: "kb_ad" },
      { id: "d_av1", name: "Отдел бортового радиоэлектронного оборудования", kbId: "kb_av" },
      { id: "d_it", name: "ИТ-отдел", kbId: null },
      { id: "d_otk", name: "Отдел технического контроля (ОТК)", kbId: null },
      { id: "d_hr", name: "Отдел кадров", kbId: null },
    ];
    const E = (id, last, first, email, pass, position, deps, roles, extra = {}) =>
      ({ id, last, first, email, pass, position, departments: deps, roles, kbIds: extra.kbIds || [], headDeptIds: extra.headDeptIds || [], phone: extra.phone || "+7 900 000-00-00", extension: extra.extension || "123", tab: extra.tab || String(1000 + Math.floor(Math.random() * 8999)), notif: { deadlineEmail: true, overdueDigest: false, commentSub: true }, failed: 0, lockUntil: 0, fired: false, passwordHistory: [], photo: null });
    const employees = [
      E("sergey.adminov", "Админов", "Сергей", "sergey.adminov", "Admin2026!", "Администратор системы", [{ deptId: "d_it", primary: true }], ["sergey.adminov"], { extension: "101" }),
      E("e_kozlov", "Козлов", "Дмитрий", "kozlov", "Director2026!", "Генеральный директор", [], ["director"], { extension: "102" }),
      E("e_lebedeva", "Лебедева", "Мария", "lebedeva", "Econ2026!", "Главный экономист", [{ deptId: "d_mgmt", primary: true }], ["economist"], { extension: "103" }),
      E("e_romanov", "Романов", "Владимир", "romanov", "KbLa2026!", "Главный конструктор КБ «ЛА»", [{ deptId: "d_mgmt", primary: true }], ["kb_chief", "executor"], { kbIds: ["kb_la"], extension: "104" }),
      E("e_belova", "Белова", "Наталья", "belova", "KbAd2026!", "Главный конструктор КБ «АД»", [{ deptId: "d_mgmt", primary: true }], ["kb_chief", "executor"], { kbIds: ["kb_ad"], extension: "105" }),
      E("e_nikitina", "Никитина", "Алина", "nikitina", "Hr2026!", "HR-менеджер", [{ deptId: "d_hr", primary: true }], ["hr", "executor"], { extension: "106" }),
      E("e_fedorov", "Фёдоров", "Игорь", "fedorov", "Head2026!", "Начальник отдела аэродинамики", [{ deptId: "d_aero", primary: true }], ["head", "executor", "pm"], { headDeptIds: ["d_aero", "d_comp"], extension: "107" }),
      E("e_gromov", "Громов", "Сергей", "gromov", "Head2026!", "Начальник отдела прочности", [{ deptId: "d_strla", primary: true }], ["head", "executor", "pm"], { headDeptIds: ["d_strla"], extension: "108" }),
      E("e_ilina", "Ильина", "Анна", "ilina", "Exec2026!", "Ведущий инженер-компоновщик", [{ deptId: "d_comp", primary: true }], ["executor"], { extension: "109" }),
      E("e_krylov", "Крылов", "Виктор", "krylov", "Head2026!", "Начальник отдела газодинамики", [{ deptId: "d_gas", primary: true }], ["head", "executor", "pm"], { headDeptIds: ["d_gas"], extension: "110" }),
      E("e_medvedev", "Медведев", "Павел", "medvedev", "Head2026!", "Начальник отдела прочности двигателей", [{ deptId: "d_stren", primary: true }], ["head", "executor", "pm"], { headDeptIds: ["d_stren"], extension: "111" }),
      E("e_orlova", "Орлова", "Елена", "orlova", "Head2026!", "Начальник отдела САУ", [{ deptId: "d_sau", primary: true }], ["head", "executor"], { headDeptIds: ["d_sau"], extension: "112" }),
      E("e_petrov", "Петров", "Николай", "petrov", "Head2026!", "Начальник ИТ-отдела", [{ deptId: "d_it", primary: true }], ["head", "executor", "pm"], { headDeptIds: ["d_it"], extension: "113" }),
      E("e_sokolov", "Соколов", "Михаил", "sokolov", "Head2026!", "Начальник ОТК", [{ deptId: "d_otk", primary: true }], ["executor"], { extension: "114" }),
      E("e_vasileva", "Васильева", "Ольга", "vasileva", "Head2026!", "Начальник отдела кадров", [{ deptId: "d_hr", primary: true }], ["head"], { headDeptIds: ["d_hr"], extension: "115" }),
      E("e_morozov", "Морозов", "Константин", "morozov", "Pm2026!", "Ведущий инженер", [{ deptId: "d_aero", primary: true }], ["pm", "executor"], { extension: "116" }),
      E("e_isaev", "Исаев", "Роман", "isaev", "Exec2026!", "Инженер-аэродинамик", [{ deptId: "d_aero", primary: true }], ["executor"], { extension: "117" }),
      E("e_zaitsev", "Зайцев", "Алексей", "zaitsev", "Exec2026!", "Инженер по прочности", [{ deptId: "d_strla", primary: true }], ["executor"], { extension: "118" }),
      E("e_frolova", "Фролова", "Дарья", "frolova", "Exec2026!", "Инженер-расчётчик", [{ deptId: "d_strla", primary: true }], ["executor"], { extension: "119" }),
      E("e_tolka", "Толкачёва", "Ирина", "tolkacheva", "Exec2026!", "Инженер-конструктор", [{ deptId: "d_comp", primary: true }], ["executor"], { extension: "120" }),
      E("e_gusev", "Гусев", "Максим", "gusev", "Exec2026!", "Инженер по весам", [{ deptId: "d_comp", primary: true }], ["executor"], { extension: "121" }),
      E("e_tihonov", "Тихонов", "Егор", "tihonov", "Exec2026!", "Инженер-газодинамик", [{ deptId: "d_gas", primary: true }], ["executor"], { extension: "122" }),
      E("e_melnik", "Мельник", "Светлана", "melnik", "Exec2026!", "Инженер по ресурсу", [{ deptId: "d_stren", primary: true }, { deptId: "d_gas", primary: false }], ["executor"], { extension: "123" }),
      E("e_koval", "Ковальчук", "Пётр", "kovalchuk", "Exec2026!", "Инженер-программист САУ", [{ deptId: "d_sau", primary: true }], ["executor"], { extension: "124" }),
      E("e_kim", "Ким", "Александр", "kim", "Exec2026!", "Разработчик", [{ deptId: "d_it", primary: true }], ["executor"], { extension: "125" }),
      E("e_somova", "Сомова", "Екатерина", "somova", "Exec2026!", "UX-дизайнер", [{ deptId: "d_it", primary: true }, { deptId: "d_av1", primary: false }], ["executor"], { extension: "126" }),
    ];
    const projects = [
      { id: "p_lm24", code: "ЛМ-24", name: "Лёгкий многоцелевой самолёт ЛМ-24", desc: "ОКР по созданию лёгкого многоцелевого самолёта.", kbId: "kb_la", managerId: "e_morozov", start: D(-25), end: D(50), status: "active", budget: 180, color: "#0ea5e9", ptype: "prod", archived: false, archivedAt: null, closedAt: null, creatorId: "e_kozlov" },
      { id: "p_cert", code: "СЕРТ-24", name: "Сертификация самолёта ЛМ-24", desc: "Комплекс сертификационных работ.", kbId: "kb_la", managerId: "e_fedorov", start: D(-10), end: D(45), status: "active", budget: 90, color: "#8b5cf6", ptype: "prod", archived: false, archivedAt: null, closedAt: null, creatorId: "e_kozlov" },
      { id: "p_heli", code: "В-112", name: "Модернизация вертолёта В-112", desc: "Модернизация планера и систем.", kbId: "kb_la", managerId: "e_gromov", start: D(-30), end: D(35), status: "active", budget: 120, color: "#f43f5e", ptype: "prod", archived: false, archivedAt: null, closedAt: null, creatorId: "e_kozlov" },
      { id: "p_rd900", code: "РД-900", name: "Турбовинтовой двигатель РД-900", desc: "Перспективный ТВД.", kbId: "kb_ad", managerId: "e_krylov", start: D(-20), end: D(60), status: "active", budget: 200, color: "#f59e0b", ptype: "prod", archived: false, archivedAt: null, closedAt: null, creatorId: "e_kozlov" },
      { id: "p_apu", code: "ВСУ-14", name: "Вспомогательная силовая установка ВСУ-14", desc: "ВСУ для ЛМ-24.", kbId: "kb_ad", managerId: "e_medvedev", start: D(-12), end: D(30), status: "active", budget: 70, color: "#10b981", ptype: "prod", archived: false, archivedAt: null, closedAt: null, creatorId: "e_kozlov" },
      { id: "p_port", code: "ИТ-ПОРТ", name: "Корпоративный портал предприятия", desc: "Внутренний портал и сервисы.", kbId: null, managerId: "e_petrov", start: D(-8), end: D(25), status: "active", budget: 80, color: "#64748b", ptype: "prod", archived: false, archivedAt: null, closedAt: null, creatorId: "e_kozlov" },
      { id: "p_event", code: "АДМ-1", name: "Внутренние мероприятия предприятия", desc: "Административный проект: организационные работы и мероприятия.", kbId: null, managerId: "", start: D(-5), end: null, status: "active", budget: null, color: "#14b8a6", ptype: "admin", archived: false, archivedAt: null, closedAt: null, creatorId: "e_kozlov" },
      { id: "p_old", code: "ИТ-15", name: "Модернизация локальной сети предприятия", desc: "Проект завершён более полугода назад — подлежит архивации.", kbId: null, managerId: "e_petrov", start: D(-300), end: D(-230), status: "closed", budget: 120, color: "#94a3b8", ptype: "prod", archived: true, archivedAt: D(-215), closedAt: D(-215), creatorId: "e_kozlov" },
      { id: "p_long", code: "АДМ-0", name: "Многолетняя программа внутренних мероприятий", desc: "Долгосрочный административный проект — исключение из архивации.", kbId: null, managerId: "e_nikitina", start: D(-400), end: null, status: "closed", budget: null, color: "#f59e0b", ptype: "admin", longterm: true, archived: false, archivedAt: null, closedAt: D(-300), creatorId: "e_kozlov" },
    ];
    const now = Date.now();
    const T = (id, title, projectId, assigneeIds, planned, s, dl, status, priority, desc, extra = {}) => {
      const history = extra.history || [{ ts: now - 86400000 * 6, who: extra.creatorId || "e_kozlov", text: "Задача создана" }];
      const creatorId = extra.creatorId || (history.length > 0 ? history[0].who : "e_kozlov");
      return {
        id, title, desc: desc || "", projectId, assigneeIds: Array.isArray(assigneeIds) ? assigneeIds : [assigneeIds],
        plannedHours: planned, start: D(s), deadline: dl === null ? null : D(dl),
        status, priority, logs: [], comments: [], history,
        creatorId,
        delegatedFrom: null, archived: false, archivedAt: null, closedAt: null, ...extra,
      };
    };
    const L = (userId, off, hours, note) => ({ id: uid(), userId, date: D(off), hours, note });
    const tasks = [
      T("t01", "Расчёт подъёмной силы крыла", "p_lm24", ["e_isaev"], 24, -12, 6, "inwork", "high", "Расчёт и оформление отчёта.", { logs: [L("e_isaev", -6, 6, "Проверка методики"), L("e_isaev", -2, 5, "Расчётная сетка")], comments: [ { id: "c1", parentId: null, authorId: "e_morozov", ts: now - 3600000 * 20, text: "@Исаев Роман — подключите, пожалуйста, отдел прочности к пятнице." }, { id: "c2", parentId: "c1", authorId: "e_isaev", ts: now - 3600000 * 18, text: "Принято, сегодня подготовлю исходные данные." } ], creatorId: "e_morozov" }),
      T("t02", "3D-модель фюзеляжа", "p_lm24", ["e_tolka"], 40, -15, 12, "inwork", "mid", "Силовой набор и обводы.", { logs: [L("e_tolka", -5, 8, "Шпангоуты")], creatorId: "e_morozov" }),
      T("t03", "Нагрузки на элероны", "p_lm24", ["e_zaitsev"], 16, -10, -2, "new", "crit", "Эпюры нагрузок для навесок.", { creatorId: "e_morozov" }),
      T("t04", "Отчёт по прочности фюзеляжа", "p_lm24", ["e_frolova"], 32, -8, 18, "review", "high", "Статика и усталость.", { logs: [L("e_frolova", -3, 12, "МКЭ-модель")], creatorId: "e_morozov" }),
      T("t05", "Весовая сводка компоновки", "p_lm24", ["e_gusev"], 20, -5, 9, "inwork", "mid", "", { logs: [L("e_gusev", -1, 4, "Сведение таблиц")], creatorId: "e_morozov" }),
      T("t06", "Программа лётных испытаний", "p_cert", ["e_fedorov"], 16, -2, 25, "new", "mid", "Совместно с лётной службой.", { creatorId: "e_fedorov" }),
      T("t07", "Согласование плана статиспытаний", "p_cert", ["e_kim"], 12, -4, 4, "inwork", "high", "", { logs: [L("e_kim", -2, 3, "Замечания")], creatorId: "e_fedorov" }),
      T("t08", "Чертежи лопастей несущего винта", "p_heli", ["e_kim"], 36, -18, 20, "inwork", "high", "Переназначено на период отпуска Сомовой.", { delegatedFrom: "e_somova", logs: [L("e_somova", -7, 10, "Комлевая часть")], creatorId: "e_gromov" }),
      T("t09", "Вибрационный расчёт главного редуктора", "p_heli", ["e_isaev"], 18, -6, 14, "new", "mid", "", { creatorId: "e_gromov" }),
      T("t10", "Термогазодинамический расчёт компрессора", "p_rd900", ["e_tihonov"], 48, -14, 28, "inwork", "crit", "Режимы взлёт/крейсер.", { logs: [L("e_tihonov", -4, 12, "Характеристики ступеней")], creatorId: "e_krylov" }),
      T("t11", "Прочность камеры сгорания", "p_rd900", ["e_medvedev"], 30, -9, 22, "inwork", "mid", "", { logs: [L("e_medvedev", -3, 6, "Теплонапряжённость")], creatorId: "e_krylov" }),
      T("t12", "ТЗ на САУ-900", "p_rd900", ["e_orlova"], 20, -7, 10, "review", "mid", "", { logs: [L("e_orlova", -2, 8, "Разделы 3–5")], creatorId: "e_krylov" }),
      T("t13", "Компрессор ВСУ-14", "p_apu", ["e_tihonov"], 22, -4, 16, "new", "mid", "", { creatorId: "e_medvedev" }),
      T("t14", "Испытания стартер-генератора ВСУ", "p_apu", ["e_gusev"], 14, -12, -4, "inwork", "high", "Стенд №3, протокол.", { logs: [L("e_gusev", -6, 6, "Прогон на стенде")], creatorId: "e_medvedev" }),
      T("t15", "Техническое задание портала", "p_port", ["e_kim"], 16, -8, 3, "closed", "mid", "", { logs: [L("e_kim", -5, 14, "ТЗ согласовано")], closedAt: D(-2), creatorId: "e_petrov" }),
      T("t16", "Дизайн модуля учёта времени", "p_port", ["e_petrov"], 24, -3, 8, "inwork", "mid", "", { logs: [L("e_petrov", -1, 5, "Макеты канбан")], creatorId: "e_petrov" }),
      T("t17", "Справочник сотрудников", "p_port", ["e_kim"], 12, 1, 13, "new", "low", "Переназначено на период отпуска Сомовой.", { delegatedFrom: "e_somova", creatorId: "e_petrov" }),
      T("t18", "Сводка весовых балансов ЛМ-24", "p_lm24", ["e_ilina"], 10, -3, 2, "review", "high", "", { logs: [L("e_ilina", -1, 6, "Сверка")], creatorId: "e_morozov" }),
      T("t19", "План сертификации узлов РД-900", "p_rd900", ["e_krylov"], 8, 2, 30, "new", "low", "", { creatorId: "e_krylov" }),
      T("t20", "Архивация чертежей В-112", "p_heli", ["e_sokolov"], 6, -10, 1, "closed", "low", "", { logs: [L("e_sokolov", -4, 6, "Реестр передан")], closedAt: D(-3), creatorId: "e_gromov" }),
      T("t21", "Подготовка зала ко Дню промышленности", "p_event", ["e_nikitina"], null, 0, 6, "new", "mid", "Административная задача.", { creatorId: "e_nikitina" }),
      T("t22", "Заказать сувенирную продукцию", "p_event", ["e_vasileva"], 6, 1, 10, "new", "low", "", { creatorId: "e_nikitina" }),
      T("t_a1", "Монтаж оборудования точек доступа", "p_old", ["e_kim"], 30, -290, -240, "closed", "mid", "Завершено в прошлом отчётном периоде.", { logs: [L("e_kim", -250, 28, "Монтаж и пусконаладка")], closedAt: D(-215), comments: [ { id: "ca1", parentId: null, authorId: "e_petrov", ts: now - 86400000 * 220, text: "Прошу зафиксировать итоговую схему размещения точек." }, { id: "ca2", parentId: "ca1", authorId: "e_kim", ts: now - 86400000 * 218, text: "Схема приложена к отчёту, всё смонтировано." } ], creatorId: "e_petrov" }),
      T("t_a2", "Аудит сетевых кабелей", "p_old", ["e_petrov"], 18, -280, -235, "closed", "low", "", { logs: [L("e_petrov", -240, 16, "Аудит завершён")], closedAt: D(-220), creatorId: "e_petrov" }),
      T("t_a3", "Подготовка регламента мероприятий", "p_long", ["e_nikitina"], 10, -320, -305, "closed", "low", "Задача долгосрочного административного проекта — не архивируется.", { logs: [L("e_nikitina", -310, 9, "Регламент готов")], closedAt: D(-300), creatorId: "e_nikitina" }),
    ];
    const vacations = [
      { id: "v1", empId: "e_somova", start: D(-2), end: D(5), type: "annual", comment: "Отдых, Сочи", status: "approved", delegation: { enabled: true, subId: "e_kim", statuses: ["inwork", "review"], state: "applied" } },
      { id: "v2", empId: "e_tihonov", start: D(3), end: D(14), type: "annual", comment: "Плановый отпуск", status: "pending", delegation: { enabled: true, subId: "e_melnik", statuses: ["inwork"], state: null } },
      { id: "v3", empId: "e_gusev", start: D(-20), end: D(-8), type: "sick", comment: "Больничный лист", status: "approved", delegation: { enabled: false, subId: null, statuses: [], state: null } },
    ];
    const hoursRequests = [
      { id: "hr1", kind: "task", targetId: "t04", oldH: 32, newH: 48, reason: "Добавился расчёт усталостных трещин по требованию ОТК.", reqId: "e_morozov", status: "pending", ts: now - 3600000 * 5 },
      { id: "hr2", kind: "project", targetId: "p_lm24", oldH: 180, newH: 210, reason: "Расширение scope: добавлены работы по сертификации.", reqId: "e_morozov", status: "pending", ts: now - 3600000 * 20 },
    ];
    const regRequests = [
      { id: "rg1", first: "Олег", last: "Новиков", email: "novikov", pass: "Exec2026!", status: "pending", ts: now - 3600000 * 26 },
    ];
    const notifications = [
      { id: uid(), userId: "e_kozlov", text: "Запрос на изменение плановых часов по задаче «Отчёт по прочности фюзеляжа» ожидает решения.", ts: now - 3600000 * 5, read: false, targetType: 'hours', targetId: 'hr1' },
      { id: uid(), userId: "e_fedorov", text: "Тихонов Е. подал заявку на отпуск с делегированием задач — требуется утверждение.", ts: now - 3600000 * 8, read: false, targetType: 'vacation', targetId: 'v2' },
      { id: uid(), userId: "e_kim", text: "Вам переданы задачи Сомовой Е. на период отпуска.", ts: now - 3600000 * 30, read: false, targetType: 'task', targetId: 't08' },
      { id: uid(), userId: "e_smirnov", text: "Новая заявка на регистрацию: Новиков Олег.", ts: now - 3600000 * 26, read: false, targetType: 'registration', targetId: 'rg1' },
      { id: uid(), userId: "e_isaev", text: "Морозов К. упомянул вас в обсуждении задачи «Расчёт подъёмной силы крыла».", ts: now - 3600000 * 20, read: false, targetType: 'task', targetId: 't01' },
    ];
    const audit = [
      { id: uid(), ts: now - 86400000 * 2, userId: "e_morozov", action: "Запрос изменения часов", details: "t04: 32 → 48 ч" },
      { id: uid(), ts: now - 86400000 * 3, userId: "e_petrov", action: "Утверждено делегирование отпуска", details: "Сомова Е. → Ким А." },
      { id: uid(), ts: now - 86400000 * 6, userId: "e_kozlov", action: "Создан проект", details: "ЛМ-24" },
    ];
    return { settings, kbs, departments, employees, projects, tasks, vacations, hoursRequests, roleDelegations: [], regRequests, notifications, audit };
  }
}