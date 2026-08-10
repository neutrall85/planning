/**
 * Утилиты для работы с проектами
 */

import { PROJECT_CATEGORIES } from './constants';

/**
 * Получить цвет категории проекта
 * @param {Object} project - объект проекта
 * @returns {string} HEX цвет
 */
export function getCategoryColor(project) {
  if (!project || project.ptype === 'admin') return '#6b7280';
  
  // Если есть прямой цвет в проекте
  if (project.color) return project.color;
  
  const categoryKey = Object.keys(PROJECT_CATEGORIES).find(
    key => PROJECT_CATEGORIES[key].label === project.category
  );
  return PROJECT_CATEGORIES[categoryKey]?.color || PROJECT_CATEGORIES.NORM.color;
}

/**
 * Получить уникальных исполнителей из списка задач
 * @param {Array} tasks - массив задач
 * @param {Array} employees - массив сотрудников
 * @returns {Array} уникальные сотрудники
 */
export function getUniqueAssignees(tasks, employees) {
  const assigneeIds = [...new Set(tasks.flatMap(t => t.assigneeIds || []))];
  return assigneeIds.map(id => employees.find(e => e.id === id)).filter(Boolean);
}

/**
 * Проверить тип проекта
 * @param {Object} project - объект проекта
 * @param {string} type - тип проекта
 * @returns {boolean}
 */
export function isProjectType(project, type) {
  return project?.ptype === type;
}

/**
 * Проверить статус проекта
 * @param {Object} project - объект проекта
 * @param {string} status - статус проекта
 * @returns {boolean}
 */
export function isProjectStatus(project, status) {
  return project?.status === status;
}
