/**
 * Утилиты для проверки прав доступа и скоупа данных
 * Заменяет удаленный хук useDataScope
 * Использует функции из permissions.js напрямую
 */

import { 
  hasRole, 
  computeScope, 
  taskVisible,
  canEditTaskFields,
  canChangeTaskStatus,
  canEditProjectFields,
  canChangeProjectStatus,
  canCreateTask,
  assigneeOptions,
  canApproveVacation,
} from './permissions';

/**
 * Получить скоуп данных пользователя
 * @param {Object} user - текущий пользователь
 * @param {Object} data - данные хранилища
 * @returns {{all: boolean, empIds: Set, projIds: Set}}
 */
export const getScope = (user, data) => {
  if (!user || !data) return { all: false, empIds: new Set(), projIds: new Set() };
  return computeScope(user, data);
};

/**
 * Проверить видимость задачи
 * @param {Object} user - пользователь
 * @param {Object} scope - скоуп данных
 * @param {Object} task - задача
 * @param {Object} data - данные хранилища
 * @returns {boolean}
 */
export const isTaskVisible = (user, scope, task, data) => {
  if (!task || !data) return false;
  return taskVisible(user, scope, task, data);
};

/**
 * Проверить права на редактирование задачи
 * @param {Object} user - пользователь
 * @param {Object} task - задача
 * @param {Object} data - данные хранилища
 * @returns {boolean}
 */
export const canEditTask = (user, task, data) => {
  if (!task) return false;
  const existing = task.id ? data?.tasks?.find(t => t.id === task.id) : null;
  return existing 
    ? canEditTaskFields(user, existing, data)
    : canCreateTask(user);
};

/**
 * Проверить права на изменение статуса задачи
 * @param {Object} user - пользователь
 * @param {Object} task - задача
 * @param {string} newStatus - новый статус
 * @param {Object} data - данные хранилища
 * @returns {boolean}
 */
export const canChangeStatus = (user, task, newStatus, data) => {
  if (!task || !data) return false;
  return canChangeTaskStatus(user, task, newStatus, data);
};

/**
 * Проверить права на редактирование проекта
 * @param {Object} user - пользователь
 * @param {Object} project - проект
 * @returns {boolean}
 */
export const canEditProject = (user, project) => {
  if (!project) return false;
  return canEditProjectFields(user, project);
};

/**
 * Проверить права на изменение статуса проекта
 * @param {Object} user - пользователь
 * @param {Object} project - проект
 * @param {string} newStatus - новый статус
 * @returns {boolean}
 */
export const canChangeProjStatus = (user, project, newStatus) => {
  if (!project) return false;
  return canChangeProjectStatus(user, project, newStatus);
};

/**
 * Получить доступные опции исполнителей
 * @param {Object} user - пользователь
 * @param {Object} data - данные хранилища
 * @returns {Array}
 */
export const getAvailableAssignees = (user, data) => {
  if (!user || !data) return [];
  return assigneeOptions(user, data);
};

/**
 * Проверить права на одобрение отпуска
 * @param {Object} user - пользователь
 * @param {Object} vacation - отпуск
 * @param {Object} data - данные хранилища
 * @returns {boolean}
 */
export const canApproveVac = (user, vacation, data) => {
  if (!vacation || !data) return false;
  return canApproveVacation(user, vacation, data);
};

// Ре-экспорт базовых функций для удобства
export { hasRole, computeScope };
