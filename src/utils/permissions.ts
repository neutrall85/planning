/**
 * Система проверки прав доступа на основе RBAC конфигурации
 * Использует декларативный подход вместо хардкода условий
 */

import { RBAC_CONFIG } from '../config/rbacConfig';

/**
 * Проверка наличия роли у пользователя
 * @param {Object} user - Объект пользователя
 * @param  {...string} roles - Список ролей для проверки
 * @returns {boolean}
 */
export const hasRole = (user, ...roles) => {
  if (!user || !user.roles) return false;
  return roles.some(role => user.roles.includes(role));
};

export const has = hasRole;

/**
 * Проверка конкретной роли директора
 * @param {Object} user 
 * @returns {boolean}
 */
export const hasRoleDirectors = (user) => hasRole(user, 'director');

/**
 * Универсальная проверка прав доступа
 * @param {Object} user - Пользователь
 * @param {string} resource - Ресурс (task, project, employee, vacation и т.д.)
 * @param {string} action - Действие (read, write, delete, approve и т.д.)
 * @param {Object} context - Дополнительный контекст (объект задачи, проекта и т.п.)
 * @param {Object} data - База данных (для сложных проверок)
 * @returns {boolean}
 */
export const can = (user, resource, action, context = null, data = null) => {
  if (!user || !user.roles) return false;

  // Администратор имеет доступ ко всему
  if (hasRole(user, 'admin')) return true;

  // Проверяем права по каждой роли пользователя
  for (const role of user.roles) {
    const roleConfig = RBAC_CONFIG[role];
    if (!roleConfig) continue;

    // Проверка wildcard '*' (доступ ко всем ресурсам)
    if (roleConfig['*'] && roleConfig['*'].includes(action)) {
      return true;
    }

    // Проверка конкретного ресурса
    if (roleConfig[resource] && roleConfig[resource].includes(action)) {
      return true;
    }
  }

  // Специфичные бизнес-правила, которые нельзя выразить через конфиг
  return checkBusinessRules(user, resource, action, context, data);
};

/**
 * Специфичные бизнес-правила, не описываемые в RBAC конфиге
 */
const checkBusinessRules = (user, resource, action, context, data) => {
  // === ЗАДАЧИ ===
  if (resource === 'task') {
    if (!context || !data) return false;

    // Запрет на изменение архивных задач
    if (context.archived) return false;

    // Изменение статуса задачи
    if (action === 'change_status') {
      const newStatus = context.newStatus;
      const task = context.task;
      
      // Закрытые/отмененные задачи может reopened только админ
      if (task.status === 'closed' || task.status === 'cancelled') {
        return hasRole(user, 'admin');
      }

      const project = data.projects.find(p => p.id === task.projectId);
      if (!project) return false;

      const isProdProject = project.ptype !== 'admin';

      // Директор может всё
      if (hasRole(user, 'director')) return true;

      // Руководитель КБ
      if (hasRole(user, 'kb_chief') && project.kbId && 
          (user.kbIds || []).includes(project.kbId)) {
        return true;
      }

      // Руководитель подразделения
      if (hasRole(user, 'head')) {
        const isSubordinate = (task.assigneeIds || []).some(id => {
          const emp = data.employees.find(e => e.id === id);
          return emp && emp.departments.some(d => 
            (user.headDeptIds || []).includes(d.deptId)
          );
        });
        if (isSubordinate) return true;
      }

      // Ведущий проекта
      if (hasRole(user, 'project_lead') && project.managerId === user.id) {
        return true;
      }

      // Менеджер проектов не меняет статусы задач
      if (hasRole(user, 'project_manager')) return false;

      // Исполнитель
      if (task.assigneeIds && task.assigneeIds.includes(user.id)) {
        // Не может закрывать/отменять
        if (newStatus === 'closed' || newStatus === 'cancelled') return false;
        
        // Может переводить только определенные статусы
        if (isProdProject) {
          const allowedTransitions = [
            ['new', 'inwork'],
            ['inwork', 'review'],
            ['review', 'inwork']
          ];
          return allowedTransitions.some(
            ([from, to]) => task.status === from && newStatus === to
          );
        }
        return true;
      }
    }

    // Редактирование полей задачи
    if (action === 'edit_fields') {
      // Админ и экономист могут всё
      if (hasRole(user, 'admin', 'economist')) return true;
      // Менеджер проектов не редактирует поля
      if (hasRole(user, 'project_manager')) return false;
      return false;
    }
  }

  // === ПРОЕКТЫ ===
  if (resource === 'project') {
    if (!context) return false;
    if (context.archived) return false;

    // Изменение статуса проекта
    if (action === 'change_status') {
      const newStatus = context.newStatus;
      
      // Директор может всё
      if (hasRole(user, 'director')) return true;
      
      // Менеджер проектов может менять статусы
      if (hasRole(user, 'project_manager')) return true;
      
      // Создатель может закрывать/отменять
      if ((newStatus === 'closed' || newStatus === 'cancelled') && 
          (context.creatorId === user.id || 
           context.history?.find(h => h.who !== 'system')?.who === user.id)) {
        return true;
      }
      
      // Руководитель КБ для своих проектов
      if (hasRole(user, 'kb_chief') && context.kbId && 
          (user.kbIds || []).includes(context.kbId)) {
        return true;
      }
    }

    // Редактирование полей проекта
    if (action === 'edit_fields') {
      // Директор может всё
      if (hasRole(user, 'director')) return true;
      // Менеджер проектов не редактирует поля
      if (hasRole(user, 'project_manager')) return false;
      return false;
    }
  }

  // === ОТПУСКА ===
  if (resource === 'vacation' && action === 'approve') {
    if (!context || !data) return false;
    
    const emp = data.employees.find(e => e.id === context.empId);
    if (!emp || emp.id === user.id) return false;
    
    const primaryDeptId = emp.departments.find(x => x.primary)?.deptId;
    
    // Руководитель подразделения
    if (hasRole(user, 'head') && primaryDeptId && 
        (user.headDeptIds || []).includes(primaryDeptId)) {
      return true;
    }
    
    // Главный конструктор для отделов своего КБ
    if (hasRole(user, 'kb_chief')) {
      const dept = data.departments.find(d => d.id === primaryDeptId);
      if (dept && dept.kbId && (user.kbIds || []).includes(dept.kbId)) {
        return true;
      }
    }
  }

  // === СОТРУДНИКИ ===
  if (resource === 'employee') {
    if (action === 'edit_departments') {
      return hasRole(user, 'admin', 'director', 'hr');
    }
    if (action === 'fire') {
      return hasRole(user, 'admin', 'director', 'hr');
    }
    if (action === 'edit_roles') {
      return hasRole(user, 'admin');
    }
  }

  // === ЭКСПОРТ ===
  if (action === 'export') {
    return hasRole(user, 'admin', 'director', 'economist');
  }

  return false;
};

// === Обертки для обратной совместимости ===

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
 * Проверка права на удаление задачи
 * @param {Object} user - Пользователь
 * @param {Object} task - Задача (для контекста, например архивная ли она)
 * @param {Object} data - База данных
 * @returns {boolean}
 */
export const canDeleteTask = (user, task, data) => {
  if (!user || !task || !data) return false;
  
  // Архивные задачи нельзя удалять
  if (task.archived) return false;
  
  // Используем универсальную функцию can для проверки права 'delete' на ресурсе 'task'
  return can(user, 'task', 'delete', task, data);
};

export const canEditTaskFields = (user, task, data) => {
  if (!user || !task || !data) return false;
  return can(user, 'task', 'edit_fields', task, data);
};

export const canChangeTaskStatus = (user, task, newStatus, data) => {
  if (!user || !task || !data) return false;
  return can(user, 'task', 'change_status', { task, newStatus }, data);
};

export const canEditProjectFields = (user, project) => {
  if (!user || !project) return false;
  return can(user, 'project', 'edit_fields', project);
};

export const canChangeProjectStatus = (user, project, newStatus) => {
  if (!user || !project) return false;
  return can(user, 'project', 'change_status', { ...project, newStatus });
};

export const projectEditable = (user, project) => canEditProjectFields(user, project);

export const canApproveVacation = (user, vacation, data) => {
  if (!user || !vacation || !data) return false;
  return can(user, 'vacation', 'approve', vacation, data);
};

/**
 * Вычисление области видимости данных для пользователя
 * @param {Object} u - Пользователь
 * @param {Object} db - База данных
 * @returns {Object} { all, empIds, projIds }
 */
export function computeScope(u, db) {
  if (!u || !db) return { all: false, empIds: new Set(), projIds: new Set() };
  
  const allE = new Set(db.employees.filter(e => !e.fired).map(e => e.id));
  const allP = new Set(db.projects.map(p => p.id));
  
  // Полный доступ для админов, директоров, экономистов, менеджеров проектов
  if (hasRole(u, "admin", "director", "economist", "project_manager")) {
    return { all: true, empIds: allE, projIds: allP };
  }
  
  const empIds = new Set([u.id]);
  const projIds = new Set();
  
  // Главный конструктор - проекты и сотрудники своего КБ
  if (hasRole(u, "kb_chief") && (u.kbIds || []).length) {
    db.projects.forEach(p => { 
      if (p.kbId && u.kbIds.includes(p.kbId)) projIds.add(p.id); 
    });
    
    const deptIds = db.departments
      .filter(d => d.kbId && u.kbIds.includes(d.kbId))
      .map(d => d.id);
    
    db.employees.filter(e => !e.fired).forEach(e => { 
      if (e.departments.some(x => deptIds.includes(x.deptId))) empIds.add(e.id); 
    });
  }
  
  // Руководитель подразделения - сотрудники своих отделов
  if (hasRole(u, "head") && (u.headDeptIds || []).length) {
    db.employees.filter(e => !e.fired).forEach(e => { 
      if (e.departments.some(x => u.headDeptIds.includes(x.deptId))) empIds.add(e.id); 
    });
  }
  
  // Ведущий проекта - свои проекты
  if (hasRole(u, "project_lead")) {
    db.projects.forEach(p => { 
      if (p.managerId === u.id) projIds.add(p.id); 
    });
  }
  
  // Проекты, где пользователь является исполнителем
  db.tasks.forEach(t => {
    if (t.assigneeIds && t.assigneeIds.some(id => empIds.has(id))) {
      projIds.add(t.projectId);
    }
  });
  
  return { all: false, empIds, projIds };
}

/**
 * Проверка видимости задачи
 */
export function taskVisible(u, scope, t, db) {
  if (!scope || !t) return false;
  if (scope.all) return true;
  if (t.assigneeIds && t.assigneeIds.some(id => scope.empIds.has(id))) return true;
  if (!scope.projIds.has(t.projectId)) return false;
  
  const proj = db.projects.find(p => p.id === t.projectId);
  if (!proj) return false;
  
  if (hasRole(u, "project_lead") && proj.managerId === u.id) return true;
  if (hasRole(u, "kb_chief") && proj.kbId && (u.kbIds || []).includes(proj.kbId)) return true;
  if (hasRole(u, "head")) return true;
  
  return false;
}

/**
 * Опции для выбора исполнителей задачи
 */
export const assigneeOptions = (user, data) => {
  if (!user || !data) return [];
  
  const allEmployees = data.employees.filter(e => !e.fired);

  let list;
  if (hasRole(user, "admin", "director", "economist", "project_lead", "project_manager")) {
    list = allEmployees;
  } else if (hasRole(user, "kb_chief") && (user.kbIds || []).length) {
    const deptIds = data.departments
      .filter(d => d.kbId && user.kbIds.includes(d.kbId))
      .map(d => d.id);
    list = allEmployees.filter(e => 
      e.id === user.id || 
      e.departments.some(x => deptIds.includes(x.deptId)) || 
      hasRole(e, "director")
    );
  } else if (hasRole(user, "head")) {
    list = allEmployees.filter(e => 
      e.id === user.id || 
      e.departments.some(x => (user.headDeptIds || []).includes(x.deptId)) || 
      hasRole(e, "director")
    );
  } else {
    list = allEmployees.filter(e => e.id === user.id);
  }
  
  return list.sort((a, b) => {
    const cmp = a.last.localeCompare(b.last);
    return cmp !== 0 ? cmp : a.first.localeCompare(b.first);
  });
};

// Экспорт утилит для обратной совместимости
export { empName as getEmpName, primaryDept as getPrimaryDept } from './string';

/**
 * @deprecated Используйте getEmpNameFromData из string.js
 */
export function empName(db, id) {
  const e = db.employees?.find(x => x.id === id);
  return e ? `${e.last} ${e.first}` : "—";
}

/**
 * @deprecated Используйте getPrimaryDeptFromData из string.js
 */
export function primaryDept(db, e) {
  if (!e) return null;
  const p = e.departments?.find(x => x.primary) || e.departments?.[0];
  return p ? db.departments?.find(d => d.id === p.deptId) : null;
}