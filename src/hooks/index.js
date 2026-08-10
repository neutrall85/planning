/**
 * Хуки приложения
 * Централизованный экспорт всех хуков
 */

export { useStore } from './useStore';
export { useAuth } from './useAuth';
export { useDataHelpers } from './useDataHelpers';
export { useTaskFilters } from './useTaskFilters';

// Новые унифицированные хуки
export { useEmployeeName, usePrimaryDept, useEmployeeHelpers } from './useEmployeeName';
export { useDataScope } from './useDataScope';
export { useFormValidation } from './useFormValidation';