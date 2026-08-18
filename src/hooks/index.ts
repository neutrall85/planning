/**
 * Хуки приложения
 * Централизованный экспорт всех хуков
 */

// Основный хук для работы с store
export { useStore } from './useStore';

// Хук для работы с данными
export { useData } from './useData';

// Хук аутентификации - единственный необходимый хук для auth
export { useAuth } from './useAuth';

// Drag-and-drop логика - полезна, оставляем
export { useDragAndDrop } from './useDragAndDrop';

// Toast хук для уведомлений
export { useToast } from './useToast';

// Бизнес-хуки
export { useTaskOperations } from './business/useTaskOperations';
export { useProjectOperations } from './business/useProjectOperations';

// Accessibility хуки
export { useModalAccessibility } from './useModalAccessibility';

// Остальные хуки удалены как избыточные обертки
// Используйте напрямую функции из utils/string.ts и utils/permissions.js