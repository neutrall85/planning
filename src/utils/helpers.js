// utils/helpers.js
export function getEmployeePrimaryDepartment(employee, db) {
  if (!employee || !db) return null;

  // Для главного конструктора возвращаем его КБ
  if (employee.roles && employee.roles.includes('kb_chief') && employee.kbIds && employee.kbIds.length > 0) {
    const kbs = employee.kbIds
      .map(id => db.kbs?.find(k => k.id === id))
      .filter(Boolean);
    if (kbs.length > 0) {
      // Если несколько КБ – возвращаем первый или объединяем через запятую
      return kbs.length === 1 ? kbs[0] : { id: kbs.map(k => k.id).join(','), name: kbs.map(k => k.name).join(', '), type: 'kb' };
    }
  }

  // Для остальных – ищем основное подразделение (primary)
  if (employee.departments && employee.departments.length > 0) {
    const primaryDept = employee.departments.find(d => d.primary) || employee.departments[0];
    if (primaryDept) {
      const dept = db.departments?.find(d => d.id === primaryDept.deptId);
      if (dept) {
        return dept;
      }
    }
  }
  return null;
}

// Упрощённая версия, возвращающая только название
export function getPrimaryDeptName(employee, db) {
  const dept = getEmployeePrimaryDepartment(employee, db);
  return dept ? dept.name : '—';
}