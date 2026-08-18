/**
 * Конфигурация прав доступа (RBAC)
 * Формат: { Роль: { Ресурс: { действия: [...] } } }
 * Действия: 'read', 'write', 'delete', 'approve', 'manage'
 */

export const RBAC_CONFIG = {
  // --- Администраторы ---
  admin: {
    '*': ['read', 'write', 'delete', 'approve', 'manage'], // Полный доступ ко всему
    system: ['configure', 'audit_logs'],
  },
  
  // --- Руководители отделов ---
  department_head: {
    employee: ['read', 'write'], // Своих сотрудников
    task: ['read', 'write', 'approve'],
    project: ['read', 'write'],
    vacation: ['approve'],
    department: ['read'],
  },
  
  // --- Менеджеры проектов ---
  project_manager: {
    project: ['read', 'write'],
    task: ['read', 'write', 'assign'],
    employee: ['read'], // Только просмотр
    vacation: ['read'],
  },
  
  // --- Сотрудники ---
  employee: {
    task: ['read', 'write_status'], // Может менять статус только своих задач
    project: ['read'],
    employee: ['read_self'],
    vacation: ['write', 'read_self'],
    comment: ['write'],
  },
  
  // --- Директора (наблюдатели с правом вето) ---
  director: {
    '*': ['read'],
    vacation: ['approve', 'reject'],
    task: ['read', 'approve'],
  },
  
  // --- Главный экономист ---
  economist: {
    '*': ['read'], // Только чтение всех ресурсов
    task: ['read', 'write', 'edit_fields'], // Может создавать и редактировать задачи
    project: ['read', 'write'], // Может редактировать проекты
    employee: ['read'], // Только просмотр сотрудников
    vacation: ['read'],
  },
};

// Роли по умолчанию для новых пользователей
export const DEFAULT_ROLES = ['employee'];
