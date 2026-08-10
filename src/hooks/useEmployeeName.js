/**
 * Хук для получения имени сотрудника
 * Устраняет дублирование функции empName в разных компонентах
 * @param {Object} data - объект данных хранилища
 * @param {string} id - ID сотрудника
 * @returns {string} Форматированное имя или "—"
 */
import { useMemo } from 'react';
import { getEmpNameFromData } from '../utils/string';

export const useEmployeeName = (data) => {
  // Мемоизируем функцию для предотвращения лишних ре-рендеров
  const empName = useMemo(() => {
    return (id) => getEmpNameFromData(data, id);
  }, [data]);

  return empName;
};

/**
 * Хук для получения основного отдела сотрудника
 * @param {Object} data - объект данных хранилища
 * @param {Object} emp - сотрудник
 * @returns {Function} Функция для получения отдела
 */
export const usePrimaryDept = (data) => {
  const getPrimaryDept = useMemo(() => {
    return (emp) => {
      if (!emp || !data?.departments) return null;
      const p = emp.departments?.find(x => x.primary) || emp.departments?.[0];
      return p ? data.departments.find(d => d.id === p.deptId) : null;
    };
  }, [data]);

  return getPrimaryDept;
};

/**
 * Комбинированный хук для работы с сотрудниками
 * Включает все функции из useDataHelpers плюс новые утилиты
 * @param {Object} data - объект данных хранилища
 * @returns {Object} Набор вспомогательных функций
 */
export const useEmployeeHelpers = (data) => {
  const empName = useEmployeeName(data);
  const getPrimaryDept = usePrimaryDept(data);

  const getTaskSpent = useMemo(() => {
    return (task) => {
      if (!task || !task.logs || !Array.isArray(task.logs)) return 0;
      return task.logs.reduce((s, l) => s + (l.hours || 0), 0);
    };
  }, []);

  const getProjectStats = useMemo(() => {
    return (projectId) => {
      if (!data || !data.tasks) return { plan: 0, fact: 0, count: 0 };
      const tasks = data.tasks.filter(t => t.projectId === projectId && !t.archived);
      const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
      const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
      return { plan, fact, count: tasks.length };
    };
  }, [data, getTaskSpent]);

  const getEmployeeLoad = useMemo(() => {
    return (empId) => {
      if (!data || !data.tasks) return { plan: 0, cnt: 0 };
      const active = data.tasks.filter(
        t => !t.archived && 
        (t.assigneeIds || []).includes(empId) && 
        !['closed', 'cancelled'].includes(t.status)
      );
      return { 
        plan: active.reduce((s, t) => s + (t.plannedHours || 0), 0), 
        cnt: active.length 
      };
    };
  }, [data]);

  const vacOverlap = useMemo(() => {
    return (empId, from, to) => {
      if (!data || !data.vacations || !from || !to) return null;
      return data.vacations.find(
        v => v.empId === empId && 
        v.status === 'approved' && 
        v.start <= to && 
        v.end >= from
      ) || null;
    };
  }, [data]);

  return { 
    empName, 
    getPrimaryDept, 
    getTaskSpent, 
    getProjectStats, 
    getEmployeeLoad, 
    vacOverlap 
  };
};

export default useEmployeeHelpers;
