/**
 * Хуки приложения
 * Централизованный экспорт всех хуков
 */

// Основный хук для работы с store
export { useStore } from './useStore';

// Хук аутентификации - единственный необходимый хук для auth
export { useAuth } from './useAuth';

// Drag-and-drop логика - полезна, оставляем
export { useDragAndDrop } from './useDragAndDrop';

// Остальные хуки удалены как избыточные обертки
// Используйте напрямую функции из utils/string.ts и utils/permissions.js