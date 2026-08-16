/**
 * Утилиты для работы с данными сотрудников и задач
 * Заменяют удаленные хуки useDataHelpers и useEmployeeHelpers
 * Используются напрямую без оберток в хуках
 */

import { COMMENT_EDIT_WINDOW_MS } from './config';
import { getEmpNameFromData, getPrimaryDeptFromData } from './string';

/**
 * Получить имя сотрудника по ID
 * @param {Object} data - объект данных хранилища
 * @param {string} id - ID сотрудника
 * @returns {string} Форматированное имя или "—"
 */
export const empName = (data, id) => getEmpNameFromData(data, id);

/**
 * Получить основной отдел сотрудника
 * @param {Object} data - объект данных хранилища
 * @param {Object} emp - сотрудник
 * @returns {Department|null} Отдел или null
 */
export const primaryDept = (data, emp) => getPrimaryDeptFromData(data, emp);

/**
 * Получить затраченное время на задачу
 * @param {Object} task - задача
 * @returns {number} Часы
 */
export const getTaskSpent = (task) => {
  if (!task || !task.logs || !Array.isArray(task.logs)) return 0;
  return task.logs.reduce((s, l) => s + (l.hours || 0), 0);
};

/**
 * Получить статистику проекта
 * @param {Object} data - данные хранилища
 * @param {string} projectId - ID проекта
 * @returns {{plan: number, fact: number, count: number}}
 */
export const getProjectStats = (data, projectId) => {
  if (!data || !data.tasks) return { plan: 0, fact: 0, count: 0 };
  const tasks = data.tasks.filter(t => t.projectId === projectId && !t.archived);
  const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
  const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
  return { plan, fact, count: tasks.length };
};

/**
 * Получить нагрузку сотрудника
 * @param {Object} data - данные хранилища
 * @param {string} empId - ID сотрудника
 * @returns {{plan: number, cnt: number}}
 */
export const getEmployeeLoad = (data, empId) => {
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

/**
 * Проверить пересечение с отпуском
 * @param {Object} data - данные хранилища
 * @param {string} empId - ID сотрудника
 * @param {string} from - дата начала периода
 * @param {string} to - дата окончания периода
 * @returns {Object|null} Пересекающийся отпуск или null
 */
export const vacOverlap = (data, empId, from, to) => {
  if (!data || !data.vacations || !from || !to) return null;
  return data.vacations.find(
    v => v.empId === empId && 
    v.status === 'approved' && 
    v.start <= to && 
    v.end >= from
  ) || null;
};

// Экспортируем константу для окна редактирования комментариев
export { COMMENT_EDIT_WINDOW_MS as COMMENT_EDIT_WINDOW };
