// utils/helpers.js
//
// Утилиты представления сотрудника.
//
// Два разных сценария отображения - две разные функции:
//
//   - getPositionInDept(employee, deptId, db) - Staff, где сотрудник
//     показан в контексте конкретного отдела. Возвращает ОДНУ должность
//     - ту, что у него в этом отделе. Название отдела не возвращает:
//     оно уже в заголовке секции.
//
//   - buildEmployeePositions(employee, db) - Cabinet и другие места,
//     где нужен ПОЛНЫЙ список мест работы с пометкой основное/совм.
//
// Обе опираются на одни и те же поля: employee.position (личная
// должность), employee.departments[i] = { deptId, primary, position },
// роль kb_chief и employee.kbIds.

/**
 * Должность сотрудника в конкретном отделе.
 *
 * @param {object} employee
 * @param {string|null} deptId - отдел, в контексте которого показываем.
 *   null - секция без отдела (руководство, уволенные).
 * @param {object} db
 * @returns {{ position: string, isExtra: boolean }}
 */
export function getPositionInDept(employee, deptId, db) {
  if (!employee) return { position: 'Сотрудник', isExtra: false };

  const isKbChief =
    Array.isArray(employee.roles) &&
    employee.roles.includes('kb_chief') &&
    Array.isArray(employee.kbIds) &&
    employee.kbIds.length > 0;

  // Вне контекста отдела - руководство, уволенные, ГК-секция.
  // Показываем личную должность без плашки.
  if (!deptId) {
    return { position: employee.position || 'Сотрудник', isExtra: false };
  }

  // ГК в любом отделе - совместитель: его основное место - КБ.
  // Даже если запись departments помечена primary, для отображения
  // она считается совмещением (см. правило в соглашениях проекта).
  if (isKbChief) {
    const entry = (employee.departments || []).find(d => d.deptId === deptId);
    const position = entry?.position || employee.position || 'Сотрудник';
    return { position, isExtra: true };
  }

  const entry = (employee.departments || []).find(d => d.deptId === deptId);

  // Сотрудник не в этом отделе (теоретически возможно при неполных
  // данных) - показываем личную должность без плашки.
  if (!entry) {
    return { position: employee.position || 'Сотрудник', isExtra: false };
  }

  // Основной отдел - должность из записи или личная, без плашки.
  if (entry.primary) {
    return {
      position: entry.position || employee.position || 'Сотрудник',
      isExtra: false,
    };
  }

  // Совмещение. Пустой position в записи означает «та же должность,
  // что и основная» - правило пользователя.
  return {
    position: entry.position || employee.position || 'Сотрудник',
    isExtra: true,
  };
}

/**
 * Полный список мест работы: основное + совмещения, с пометкой.
 * Используется в Cabinet, где нужен именно «отдел - должность - основное/совм».
 *
 * @returns {Array<{ kind: 'primary'|'extra', orgName: string, position: string }>}
 */
export function buildEmployeePositions(employee, db) {
  if (!employee || !db) return [];

  const departments = employee.departments || [];
  const result = [];

  const isKbChief =
    Array.isArray(employee.roles) &&
    employee.roles.includes('kb_chief') &&
    Array.isArray(employee.kbIds) &&
    employee.kbIds.length > 0;

  if (isKbChief) {
    const kbNames = employee.kbIds
      .map(id => db.kbs?.find(k => k.id === id)?.name)
      .filter(Boolean);

    result.push({
      kind: 'primary',
      orgName: kbNames.join(', '),
      position: employee.position || 'Главный конструктор',
    });

    for (const d of departments) {
      const dept = db.departments?.find(x => x.id === d.deptId);
      if (!dept) continue;
      result.push({
        kind: 'extra',
        orgName: dept.name,
        position: d.position || employee.position || '',
      });
    }

    return result;
  }

  const primaryDept = departments.find(d => d.primary) || departments[0];
  if (primaryDept) {
    const dept = db.departments?.find(x => x.id === primaryDept.deptId);
    if (dept) {
      result.push({
        kind: 'primary',
        orgName: dept.name,
        position: primaryDept.position || employee.position || '',
      });
    }
    for (const d of departments) {
      if (d === primaryDept) continue;
      const dd = db.departments?.find(x => x.id === d.deptId);
      if (!dd) continue;
      result.push({
        kind: 'extra',
        orgName: dd.name,
        position: d.position || employee.position || '',
      });
    }
    return result;
  }

  if (employee.position) {
    result.push({ kind: 'primary', orgName: '', position: employee.position });
  }
  return result;
}

/** «Организация - должность» для Cabinet. */
export function formatPositionLabel(pos) {
  if (!pos) return '';
  const { orgName, position } = pos;
  if (!orgName && !position) return '';
  if (!orgName) return position;
  if (!position) return orgName;
  return `${orgName} - ${position}`;
}

/** Название основного подразделения (или КБ у ГК). Совмещения не учитываются. */
export function getEmployeePrimaryDepartment(employee, db) {
  if (!employee || !db) return null;

  if (
    Array.isArray(employee.roles) &&
    employee.roles.includes('kb_chief') &&
    Array.isArray(employee.kbIds) &&
    employee.kbIds.length > 0
  ) {
    const kbs = employee.kbIds
      .map(id => db.kbs?.find(k => k.id === id))
      .filter(Boolean);
    if (kbs.length > 0) {
      return kbs.length === 1
        ? kbs[0]
        : { id: kbs.map(k => k.id).join(','), name: kbs.map(k => k.name).join(', '), type: 'kb' };
    }
  }

  if (employee.departments && employee.departments.length > 0) {
    const primaryDept = employee.departments.find(d => d.primary) || employee.departments[0];
    if (primaryDept) {
      const dept = db.departments?.find(d => d.id === primaryDept.deptId);
      if (dept) return dept;
    }
  }

  return null;
}

export function getPrimaryDeptName(employee, db) {
  const dept = getEmployeePrimaryDepartment(employee, db);
  return dept ? dept.name : '-';
}