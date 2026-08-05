import { ROLES } from './constants';

export const hasRole = (user, ...roles) => !!user && roles.some(r => user.roles.includes(r));
export const has = hasRole;

export const canEditDepartments = (user) => hasRole(user, "admin", "director", "hr");
export const canManageAllVacations = (user) => hasRole(user, "admin", "director", "hr");
export const canRestore = (user) => hasRole(user, "admin", "director");
export const canCreateTask = (user) => hasRole(user, "admin", "director", "economist", "kb_chief", "head", "pm");
export const canCreateProject = (user) => hasRole(user, "admin", "director", "kb_chief");
export const canManageManager = (user) => hasRole(user, "admin", "director", "kb_chief");
export const canExport = (user) => hasRole(user, "admin", "director", "economist");
export const canEditRoles = (user) => hasRole(user, "admin");

export const canFireEmployee = (user) => hasRole(user, "admin", "director", "hr");

export const canEditTask = (user, task, data) => {
  if (!user || !task || !data) return false;
  if (task.archived) return false;
  if (hasRole(user, "admin", "director", "economist")) return true;
  
  const assignees = task.assigneeIds || [];
  const project = data.projects.find(p => p.id === task.projectId);
  
  if (!assignees.length && !project) return false;
  
  if (assignees.includes(user.id)) return true;
  
  if (hasRole(user, "kb_chief") && (user.kbIds || []).length) {
    if (project && project.kbId && user.kbIds.includes(project.kbId)) return true;
  }
  
  if (hasRole(user, "head") && assignees.some(id => {
    const e = data.employees.find(x => x.id === id);
    return e && e.departments.some(d => (user.headDeptIds || []).includes(d.deptId));
  })) return true;
  
  if (hasRole(user, "pm") && project && project.managerId === user.id) return true;
  
  return false;
};

// ИЗМЕНЕНИЕ: добавлена проверка creatorId для закрытия/отмены
export const canChangeTaskStatus = (user, task, newStatus, data) => {
  if (!user || !task || !data) return false;
  if (task.archived) return false;
  
  if (newStatus !== 'closed' && newStatus !== 'cancelled') {
    return canEditTask(user, task, data);
  }
  
  // Закрытие/отмена доступны:
  // - админу, директору, экономисту
  // - автору задачи (creatorId)
  // - PM, руководителю отдела, гл. конструктору (с проверкой)
  if (hasRole(user, "admin", "director", "economist")) return true;
  
  // ИЗМЕНЕНИЕ: автор задачи может закрыть/отменить
  if (task.creatorId && task.creatorId === user.id) return true;
  
  const project = data.projects.find(p => p.id === task.projectId);
  
  if (hasRole(user, "pm") && project && project.managerId === user.id) return true;
  
  if (hasRole(user, "head") && (task.assigneeIds || []).some(id => {
    const e = data.employees.find(x => x.id === id);
    return e && e.departments.some(d => (user.headDeptIds || []).includes(d.deptId));
  })) return true;
  
  if (hasRole(user, "kb_chief") && project && project.kbId && (user.kbIds || []).includes(project.kbId)) return true;
  
  return false;
};

export const projectEditable = (user, project, data) => {
  if (!project || project.archived) return false;
  if (hasRole(user, "admin", "director", "economist", "kb_chief")) return true;
  return false;
};

export const assigneeOptions = (user, data) => {
  if (!user || !data) return [];
  let list = [];
  
  if (hasRole(user, "admin", "director", "economist", "pm")) {
    list = data.employees.filter(e => !e.fired);
  } else if (hasRole(user, "kb_chief") && (user.kbIds || []).length) {
    const deptIds = data.departments.filter(d => d.kbId && user.kbIds.includes(d.kbId)).map(d => d.id);
    list = data.employees.filter(e => !e.fired && (e.id === user.id || e.departments.some(x => deptIds.includes(x.deptId))));
  } else if (hasRole(user, "head")) {
    list = data.employees.filter(e => !e.fired && (e.id === user.id || e.departments.some(x => (user.headDeptIds || []).includes(x.deptId))));
  } else {
    list = data.employees.filter(e => !e.fired && e.id === user.id);
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

export function computeScope(u, db) {
  if (!u || !db) return { all: false, empIds: new Set(), projIds: new Set() };
  const allE = new Set(db.employees.filter(e => !e.fired).map(e => e.id));
  const allP = new Set(db.projects.map(p => p.id));
  if (hasRole(u, "admin", "director", "economist")) return { all: true, empIds: allE, projIds: allP };
  
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
  if (hasRole(u, "pm")) db.projects.forEach(p => { if (p.managerId === u.id) projIds.add(p.id); });
  
  db.tasks.forEach(t => {
    if (t.assigneeIds && t.assigneeIds.some(id => empIds.has(id))) projIds.add(t.projectId);
  });
  
  return { all: false, empIds, projIds };
}

export function taskVisible(u, scope, t, db) {
  if (!scope || !t) return false;
  if (scope.all) return true;
  if (t.assigneeIds && t.assigneeIds.some(id => scope.empIds.has(id))) return true;
  if (!scope.projIds.has(t.projectId)) return false;
  const proj = db.projects.find(p => p.id === t.projectId);
  if (!proj) return false;
  if (hasRole(u, "pm") && proj.managerId === u.id) return true;
  if (hasRole(u, "kb_chief") && proj.kbId && (u.kbIds || []).includes(proj.kbId)) return true;
  if (hasRole(u, "head")) return true;
  return false;
}

export function empName(db, id) {
  const e = db.employees.find(x => x.id === id);
  return e ? `${e.last} ${e.first}` : "—";
}
export function primaryDept(db, e) {
  if (!e) return null;
  const p = e.departments.find(x => x.primary) || e.departments[0];
  return p ? db.departments.find(d => d.id === p.deptId) : null;
}