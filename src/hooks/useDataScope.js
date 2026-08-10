/**
 * Хук для работы с правами доступа и скоупом данных
 * Устраняет дублирование логики фильтрации по правам доступа
 * @param {Object} user - текущий пользователь
 * @param {Object} data - объект данных хранилища
 * @returns {Object} Набор функций и данных для работы с правами
 */
import { useMemo, useCallback } from 'react';
import { 
  hasRole, 
  computeScope, 
  taskVisible,
  canEditTaskFields,
  canChangeTaskStatus,
  canEditProjectFields,
  canChangeProjectStatus,
  canCreateTask,
  canCreateProject,
  assigneeOptions,
  canApproveVacation,
} from '../utils/permissions';

export const useDataScope = (user, data) => {
  // Мемоизируем вычисление скоупа
  const scope = useMemo(() => {
    if (!user || !data) return { all: false, empIds: new Set(), projIds: new Set() };
    return computeScope(user, data);
  }, [user, data]);

  // Мемоизируем проверку видимости задачи
  const isTaskVisible = useCallback((task) => {
    if (!task || !data) return false;
    return taskVisible(user, scope, task, data);
  }, [user, scope, data]);

  // Мемоизируем проверку прав на редактирование задачи
  const canEditTask = useCallback((task) => {
    if (!task) return false;
    const existing = task.id ? data?.tasks?.find(t => t.id === task.id) : null;
    return existing 
      ? canEditTaskFields(user, existing, data)
      : canCreateTask(user);
  }, [user, data]);

  // Мемоизируем проверку прав на изменение статуса задачи
  const canChangeStatus = useCallback((task, newStatus) => {
    if (!task || !data) return false;
    return canChangeTaskStatus(user, task, newStatus, data);
  }, [user, data]);

  // Мемоизируем проверку прав на редактирование проекта
  const canEditProject = useCallback((project) => {
    if (!project) return false;
    return canEditProjectFields(user, project);
  }, [user]);

  // Мемоизируем проверку прав на изменение статуса проекта
  const canChangeProjStatus = useCallback((project, newStatus) => {
    if (!project) return false;
    return canChangeProjectStatus(user, project, newStatus);
  }, [user]);

  // Мемоизируем опции исполнителей
  const availableAssignees = useMemo(() => {
    if (!user || !data) return [];
    return assigneeOptions(user, data);
  }, [user, data]);

  // Мемоизируем проверку прав на одобрение отпуска
  const canApproveVac = useCallback((vacation) => {
    if (!vacation || !data) return false;
    return canApproveVacation(user, vacation, data);
  }, [user, data]);

  // Проверка роли
  const has = useCallback((...roles) => {
    return hasRole(user, ...roles);
  }, [user]);

  return {
    // Скоуп данных
    scope,
    
    // Проверки видимости
    isTaskVisible,
    
    // Проверки прав на задачи
    canEditTask,
    canChangeStatus,
    
    // Проверки прав на проекты
    canEditProject,
    canChangeProjStatus,
    
    // Проверки прав на отпуска
    canApproveVac,
    
    // Доступные исполнители
    availableAssignees,
    
    // Универсальная проверка роли
    hasRole: has,
  };
};

export default useDataScope;
