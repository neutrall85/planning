import { COMMENT_EDIT_WINDOW_MS, COMPANY_DOMAIN } from '../utils/config';
import { getEmpNameFromData, getPrimaryDeptFromData } from '../utils/string';

/**
 * @deprecated Используйте useEmployeeHelpers из useEmployeeName.js
 * Этот хук оставлен для обратной совместимости, но дублирует логику
 */
export const useDataHelpers = (data) => {
  // Делегируем централизованным функциям из utils/string.js
  const empName = (id) => getEmpNameFromData(data, id);
  const primaryDept = (emp) => getPrimaryDeptFromData(data, emp);

  const getTaskSpent = (task) => {
    if (!task || !task.logs || !Array.isArray(task.logs)) return 0;
    return task.logs.reduce((s, l) => s + (l.hours || 0), 0);
  };

  const getProjectStats = (projectId) => {
    if (!data || !data.tasks) return { plan: 0, fact: 0, count: 0 };
    const tasks = data.tasks.filter(t => t.projectId === projectId && !t.archived);
    const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
    const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
    return { plan, fact, count: tasks.length };
  };

  const getEmployeeLoad = (empId) => {
    if (!data || !data.tasks) return { plan: 0, cnt: 0 };
    const active = data.tasks.filter(t => !t.archived && (t.assigneeIds || []).includes(empId) && !['closed','cancelled'].includes(t.status));
    return { plan: active.reduce((s, t) => s + (t.plannedHours || 0), 0), cnt: active.length };
  };

  const vacOverlap = (empId, from, to) => {
    if (!data || !data.vacations || !from || !to) return null;
    return data.vacations.find(v => v.empId === empId && v.status === 'approved' && v.start <= to && v.end >= from) || null;
  };

  // Экспортируем константу для окна редактирования комментариев
  const COMMENT_EDIT_WINDOW = COMMENT_EDIT_WINDOW_MS;

  return { empName, primaryDept, getTaskSpent, getProjectStats, getEmployeeLoad, vacOverlap, COMMENT_EDIT_WINDOW };
};