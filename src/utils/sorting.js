/**
 * Утилиты для сортировки задач и проектов
 */

import { TASK_STATUS_ORDER, PRIORITIES } from './constants';

/**
 * Сортировка задач по выбранному критерию
 * @param {Array} tasks - массив задач
 * @param {string} sortBy - критерий сортировки
 * @returns {Array} Отсортированный массив задач
 */
export const sortTasks = (tasks, sortBy) => {
  if (!tasks || !sortBy) return tasks;
  
  const sorted = [...tasks];
  
  switch (sortBy) {
    case 'priority':
      return sorted.sort((a, b) => {
        const priorityOrder = ['high', 'medium', 'low'];
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      });
    
    case 'deadline':
      return sorted.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    
    case 'status':
      return sorted.sort((a, b) => {
        const statusA = TASK_STATUS_ORDER[a.status] ?? 999;
        const statusB = TASK_STATUS_ORDER[b.status] ?? 999;
        return statusA - statusB;
      });
    
    case 'assignee':
      return sorted.sort((a, b) => {
        const assigneeA = a.assigneeIds?.[0] || '';
        const assigneeB = b.assigneeIds?.[0] || '';
        return assigneeA.localeCompare(assigneeB);
      });
    
    case 'created':
      return sorted.sort((a, b) => {
        const dateA = a.createdAt || a.start;
        const dateB = b.createdAt || b.start;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateB) - new Date(dateA);
      });
    
    default:
      return tasks;
  }
};

/**
 * Сортировка проектов по выбранному критерию
 * @param {Array} projects - массив проектов
 * @param {string} sortBy - критерий сортировки
 * @returns {Array} Отсортированный массив проектов
 */
export const sortProjects = (projects, sortBy) => {
  if (!projects || !sortBy) return projects;
  
  const sorted = [...projects];
  
  switch (sortBy) {
    case 'status':
      return sorted.sort((a, b) => {
        const statusA = PROJECT_STATUS_ORDER[a.status] ?? 999;
        const statusB = PROJECT_STATUS_ORDER[b.status] ?? 999;
        return statusA - statusB;
      });
    
    case 'deadline':
      return sorted.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    
    case 'manager':
      return sorted.sort((a, b) => {
        const managerA = a.managerId || '';
        const managerB = b.managerId || '';
        return managerA.localeCompare(managerB);
      });
    
    case 'created':
      return sorted.sort((a, b) => {
        const dateA = a.createdAt || a.start;
        const dateB = b.createdAt || b.start;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return new Date(dateB) - new Date(dateA);
      });
    
    default:
      return projects;
  }
};

// Порядок статусов проектов (если ещё не определён в constants)
const PROJECT_STATUS_ORDER = {
  'new': 0,
  'in_progress': 1,
  'review': 2,
  'closed': 3,
  'cancelled': 4
};

/**
 * Общие утилиты для drag-and-drop
 */
export const handleDragOver = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

export const handleDragLeave = (e) => {
  // Можно добавить визуальную обратную связь
};

export const getDropData = (e) => {
  try {
    const data = e.dataTransfer.getData('application/json');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};
