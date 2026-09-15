// src/utils/permissions.js

export const hasRole = (user, ...roles) => !!user && roles.some(r => user.roles.includes(r));
export const has = hasRole;

export const canEditDepartments = (user) => hasRole(user, "admin", "director", "hr");
export const canManageAllVacations = (user) => hasRole(user, "admin", "director", "hr");
export const canRestore = (user) => hasRole(user, "admin", "director");
export const canCreateTask = (user) => hasRole(user, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");
export const canCreateProject = (user) => hasRole(user, "admin", "director", "kb_chief", "project_manager");
export const canManageManager = (user) => hasRole(user, "admin", "director", "kb_chief", "project_manager");
export const canExport = (user) => hasRole(user, "admin", "director", "economist");
export const canEditRoles = (user) => hasRole(user, "admin");
export const canFireEmployee = (user) => hasRole(user, "admin", "director", "hr");

/**
 * Право сохранять шаблоны.
 *
 * Шаблон — «заготовка» задачи или проекта, поэтому право на шаблон
 * производно от права создать соответствующую сущность. Формула
 * выражена через canCreateTask / canCreateProject: при изменении состава
 * ролей там право на шаблон пересчитается автоматически. В
 * TemplatesView используется композитный предикат; в карточках — тот
 * одиночный, что соответствует типу карточки.
 */
export const canCreateTemplate = (user) =>
  canCreateTask(user) || canCreateProject(user);

// ---------------------------------------------------------------------------
// Доступ к проекту
// ---------------------------------------------------------------------------

/**
 * Явный доступ к проекту — через поле project.access.userIds.
 * Роль-доступ не входит сюда: он часть базовой видимости
 * (см. computeBaseScope) и отдельно учитывается в модалке как
 * «доступ по роли» — его нельзя снять.
 *
 * Пустое/отсутствующее поле access трактуется как «явного доступа ни у
 * кого нет». Безопасное поведение по умолчанию.
 */
export const hasProjectAccess = (user, project) => {
  if (!user || !project) return false;
  const access = project.access;
  if (!access) return false;
  const userIds = Array.isArray(access.userIds) ? access.userIds : [];
  return userIds.includes(user.id);
};

/**
 * Право управлять доступом к проекту. Круг ролей: админ, ГД, главный
 * конструктор (в своём КБ), менеджер проектов. Симметрично
 * canChangeProjectStatus — тот же паттерн проверки КБ.
 */
export const canManageProjectAccess = (user, project) => {
  if (!user || !project) return false;
  if (hasRole(user, 'admin', 'director', 'project_manager')) return true;
  if (hasRole(user, 'kb_chief') && project.kbId && (user.kbIds || []).includes(project.kbId)) return true;
  return false;
};

/**
 * Видит ли сотрудник проект по «встроенным» правилам: без учёта
 * явного персонального доступа.
 *
 * Реализация — через computeBaseScope: одно место описывает, что
 * вообще доступно пользователю, и все места, которым нужно «увидеть
 * проект по роли», спрашивают здесь.
 */
export const canSeeProjectByDefault = (user, project, db) => {
  if (!user || !project || !db) return false;
  const scope = computeBaseScope(user, db);
  return scope.all || scope.projIds.has(project.id);
};

// ---------------------------------------------------------------------------
// Вспомогательные предикаты для прав на задачи.
// ---------------------------------------------------------------------------

const isKbChiefOf = (user, project) =>
  !!(project?.kbId && hasRole(user, 'kb_chief') && (user.kbIds || []).includes(project.kbId));

const isHeadOfAssignee = (user, task, data) => {
  if (!hasRole(user, 'head') || !task.assigneeId) return false;
  const emp = data.employees.find(x => x.id === task.assigneeId);
  return !!(emp && emp.departments.some(d => (user.headDeptIds || []).includes(d.deptId)));
};

const isLeadOf = (user, project) =>
  !!(project && hasRole(user, 'project_lead') && project.managerId === user.id);

const isAssignee = (user, task) => task.assigneeId === user.id;

const isBlockedTransition = (newStatus) => newStatus === 'closed' || newStatus === 'cancelled';

const PROD_ASSIGNEE_TRANSITIONS = {
  new: ['inwork'],
  inwork: ['review'],
  review: ['inwork'],
};

export const canEditTaskFields = (user, task, data) => {
  if (!user || !task || !data) return false;
  if (task.archived) return false;
  if (hasRole(user, "admin", "economist")) return true;
  if (hasRole(user, "project_manager")) return false;
  return false;
};

export const canChangeTaskStatus = (user, task, newStatus, data) => {
  if (!user || !task || !data) return false;
  if (task.archived) return false;

  if (task.status === 'closed' || task.status === 'cancelled') {
    return hasRole(user, 'admin');
  }

  const project = data.projects.find(p => p.id === task.projectId);
  const isProdProject = !!(project && project.ptype !== 'admin');

  if (hasRole(user, 'admin', 'director')) return true;
  if (isKbChiefOf(user, project)) return true;
  if (isHeadOfAssignee(user, task, data)) return true;
  if (isLeadOf(user, project)) return true;

  if (isProdProject && hasRole(user, 'project_manager')) return false;

  if (!isAssignee(user, task)) return false;
  if (isBlockedTransition(newStatus)) return false;

  if (!isProdProject) return true;

  return (PROD_ASSIGNEE_TRANSITIONS[task.status] || []).includes(newStatus);
};

export const canEditProjectFields = (user, project) => {
  if (!user || !project) return false;
  if (project.archived) return false;
  if (hasRole(user, "admin", "director")) return true;
  if (hasRole(user, "project_manager")) return false;
  return false;
};

export const canChangeProjectStatus = (user, project, newStatus) => {
  if (!user || !project) return false;
  if (project.archived) return false;

  if (hasRole(user, 'admin')) return true;
  if (hasRole(user, 'director')) return true;
  if (hasRole(user, 'project_manager')) return true;

  if (newStatus === 'closed' || newStatus === 'cancelled') {
    const creatorId = project.creatorId || (project.history?.find(h => h.who !== 'system')?.who);
    if (creatorId && creatorId === user.id) return true;
  }

  if (hasRole(user, 'kb_chief') && project.kbId && (user.kbIds || []).includes(project.kbId)) return true;

  return false;
};

export const assigneeOptions = (user, data) => {
  if (!user || !data) return [];
  let list = [];
  const allEmployees = data.employees.filter(e => !e.fired);

  if (hasRole(user, "admin", "director", "economist", "project_lead", "project_manager")) {
    list = allEmployees;
  } else if (hasRole(user, "kb_chief") && (user.kbIds || []).length) {
    const deptIds = data.departments.filter(d => d.kbId && user.kbIds.includes(d.kbId)).map(d => d.id);
    list = allEmployees.filter(e => e.id === user.id || e.departments.some(x => deptIds.includes(x.deptId)) || hasRole(e, "director"));
  } else if (hasRole(user, "head")) {
    list = allEmployees.filter(e => e.id === user.id || e.departments.some(x => (user.headDeptIds || []).includes(x.deptId)) || hasRole(e, "director"));
  } else {
    list = allEmployees.filter(e => e.id === user.id);
  }
  return list.sort((a, b) => {
    const cmp = a.last.localeCompare(b.last);
    return cmp !== 0 ? cmp : a.first.localeCompare(b.first);
  });
};

export const canApproveVacation = (user, vacation, data) => {
  if (hasRole(user, "admin", "director")) return true;
  const emp = data.employees.find(e => e.id === vacation.empId);
  if (!emp || emp.id === user.id) return false;
  const primaryDeptId = emp.departments.find(x => x.primary)?.deptId;
  if (hasRole(user, "head") && primaryDeptId && (user.headDeptIds || []).includes(primaryDeptId)) return true;
  if (hasRole(user, "kb_chief")) {
    const dept = data.departments.find(d => d.id === primaryDeptId);
    if (dept && dept.kbId && (user.kbIds || []).includes(dept.kbId)) return true;
  }
  return false;
};

/**
 * Базовая видимость пользователя — без явного доступа к проектам.
 *
 * Сюда попадает всё, что «даётся ролью или участием»: scope.all для
 * admin/director/economist/project_manager; проекты КБ для kb_chief;
 * проекты в руководстве для project_lead; проекты, где есть задачи
 * пользователя или его подчинённых (head/kb_chief).
 *
 * Отдельная функция — потому что на неё опирается canSeeProjectByDefault:
 * если бы она звала computeScope, тот бы через hasProjectAccess вернулся
 * к явному доступу и получилась бы рекурсия. Разделение базовой
 * видимости и явного оверрайда — это граница между «по роли» и
 * «персонально».
 */
export function computeBaseScope(u, db) {
  if (!u || !db) return { all: false, empIds: new Set(), projIds: new Set() };
  const allE = new Set(db.employees.filter(e => !e.fired).map(e => e.id));
  const allP = new Set(db.projects.map(p => p.id));
  if (hasRole(u, "admin", "director", "economist", "project_manager")) {
    return { all: true, empIds: allE, projIds: allP };
  }
  const empIds = new Set([u.id]);
  const projIds = new Set();
  if (hasRole(u, "kb_chief") && (u.kbIds || []).length) {
    const dIds = db.departments.filter(d => d.kbId && u.kbIds.includes(d.kbId)).map(d => d.id);
    db.employees.filter(e => !e.fired).forEach(e => { if (e.departments.some(x => dIds.includes(x.deptId))) empIds.add(e.id); });
    db.projects.forEach(p => { if (p.kbId && u.kbIds.includes(p.kbId)) projIds.add(p.id); });
  }
  if (hasRole(u, "head") && (u.headDeptIds || []).length) {
    db.employees.filter(e => !e.fired).forEach(e => { if (e.departments.some(x => u.headDeptIds.includes(x.deptId))) empIds.add(e.id); });
  }
  if (hasRole(u, "project_lead")) db.projects.forEach(p => { if (p.managerId === u.id) projIds.add(p.id); });
  db.tasks.forEach(t => {
    if (t.assigneeId && empIds.has(t.assigneeId)) projIds.add(t.projectId);
  });
  return { all: false, empIds, projIds };
}

/**
 * Полная область видимости = базовая + явный доступ к проектам.
 * Единственная точка расширения: любое новое правило видимости
 * добавляет id в projIds здесь, а не растекается по компонентам.
 */
export function computeScope(u, db) {
  const scope = computeBaseScope(u, db);
  if (scope.all) return scope;
  db.projects.forEach(p => {
    if (hasProjectAccess(u, p)) scope.projIds.add(p.id);
  });
  return scope;
}

export function taskVisible(u, scope, t, db) {
  if (!scope || !t) return false;
  if (scope.all) return true;
  if (t.assigneeId && scope.empIds.has(t.assigneeId)) return true;
  if (!scope.projIds.has(t.projectId)) return false;
  const proj = db.projects.find(p => p.id === t.projectId);
  if (!proj) return false;
  if (hasProjectAccess(u, proj)) return true;
  if (hasRole(u, "project_lead") && proj.managerId === u.id) return true;
  if (hasRole(u, "kb_chief") && proj.kbId && (u.kbIds || []).includes(proj.kbId)) return true;
  if (hasRole(u, "head")) return true;
  return false;
}

export function empName(db, id) {
  const e = db.employees.find(x => x.id === id);
  return e ? `${e.last} ${e.first}` : "-";
}

export function primaryDept(db, e) {
  if (!e) return null;
  const p = e.departments.find(x => x.primary) || e.departments[0];
  return p ? db.departments.find(d => d.id === p.deptId) : null;
}