// src/hooks/useDataHelpers.js
import { useCallback, useMemo } from 'react';
import { useSelector } from '../context/StoreContext';

/**
 * Хелперы для чтения производных данных.
 *
 * Подписывается на срезы через useSelector: идентичность функций
 * стабильна, пока не изменился соответствующий срез.
 *
 * Параметр data - ВРЕМЕННЫЙ, для обратной совместимости с кодом,
 * который ещё прокидывает data через пропсы. Если передан - хелперы
 * используют его срезы; если нет - берут из стора.
 *
 * Для нового кода вызывайте без аргумента:
 *     const { empName } = useDataHelpers();
 *
 * empName и primaryDept - резолв по Map<id, entity>, построенной на
 * срез employees/departments. Раньше был .find() - на больших списках
 * (empName вызывается в рендере каждой строки во всех таблицах) это
 * складывалось в O(N·M).
 */
export const useDataHelpers = (data) => {
  const employeesFromStore = useSelector(s => s.employees);
  const departmentsFromStore = useSelector(s => s.departments);
  const tasksFromStore = useSelector(s => s.tasks);
  const vacationsFromStore = useSelector(s => s.vacations);

  const employees   = data?.employees   ?? employeesFromStore;
  const departments = data?.departments ?? departmentsFromStore;
  const tasks       = data?.tasks       ?? tasksFromStore;
  const vacations   = data?.vacations   ?? vacationsFromStore;

  const employeesById = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees],
  );
  const departmentsById = useMemo(
    () => new Map(departments.map(d => [d.id, d])),
    [departments],
  );

  const empName = useCallback((id) => {
    const e = employeesById.get(id);
    return e ? `${e.last} ${e.first}` : '-';
  }, [employeesById]);

  const primaryDept = useCallback((emp) => {
    if (!emp) return null;
    const p = emp.departments?.find(x => x.primary) || emp.departments?.[0];
    return p ? departmentsById.get(p.deptId) || null : null;
  }, [departmentsById]);

  const getTaskSpent = useCallback((task) => {
    if (!task || !Array.isArray(task.logs)) return 0;
    return task.logs.reduce((s, l) => s + (l.hours || 0), 0);
  }, []);

  const getProjectStats = useCallback((projectId) => {
    const list = tasks.filter(t => t.projectId === projectId && !t.archived);
    const plan = list.reduce((s, t) => s + (t.plannedHours || 0), 0);
    const fact = list.reduce((s, t) => s + getTaskSpent(t), 0);
    return { plan, fact, count: list.length };
  }, [tasks, getTaskSpent]);

  const getEmployeeLoad = useCallback((empId) => {
    const active = tasks.filter(
      t => !t.archived && t.assigneeId === empId && !['closed', 'cancelled'].includes(t.status)
    );
    return {
      plan: active.reduce((s, t) => s + (t.plannedHours || 0), 0),
      cnt: active.length,
    };
  }, [tasks]);

  const vacOverlap = useCallback((empId, from, to) => {
    if (!from || !to) return null;
    return vacations.find(
      v => v.empId === empId && v.status === 'approved' && v.start <= to && v.end >= from
    ) || null;
  }, [vacations]);

  return { empName, primaryDept, getTaskSpent, getProjectStats, getEmployeeLoad, vacOverlap };
};