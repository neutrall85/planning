/**
 * Конфигурация приложения
 * Все магические числа и строки вынесены сюда с комментариями
 */

// ===== ВРЕМЕННЫЕ ИНТЕРВАЛЫ (в миллисекундах) =====
export const DEADLINE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 часа - интервал проверки дедлайнов
export const ARCHIVE_AFTER_MONTHS = 3; // Месяцев до архивации задач
export const COMMENT_EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 минут на редактирование комментария
export const ACCOUNT_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 минут блокировки после неудачных попыток
export const SESSION_COOKIE_MAX_AGE_DAYS = 30; // Срок жизни сессии в днях
export const AUTO_HIDE_TOAST_MS = 3000; // Время авто-скрытия toast уведомлений
export const PASSWORD_AUTO_HIDE_MS = 10000; // Время показа пароля (10 секунд)
export const SHAKE_ANIMATION_MS = 450; // Длительность анимации shake при ошибке входа
export const DOWNLOAD_LINK_CLEANUP_MS = 500; // Задержка перед очисткой URL после скачивания

// ===== НАСТРОЙКИ БЕЗОПАСНОСТИ =====
export const PASSWORD_MIN_LENGTH = 8;
export const MAX_LOGIN_ATTEMPTS = 5;
export const COMPANY_DOMAIN = "volga-dnepr.com";

// ===== РАЗРЕШЁННЫЕ ДОМЕНЫ EMAIL =====
export const ALLOWED_EMAIL_DOMAINS = [
  "volga-dnepr.com",
  "volgadnepr.com",
  "vd-aviation.com",
];

// ===== НАСТРОЙКИ ПРОВЕРКИ ДЕДЛАЙНОВ =====
export const DEADLINE_CHECK_HOUR_MOSCOW = 7; // Час проверки дедлайнов (по Москве)
export const DEADLINE_NOTIFY_DAYS = [1, 3]; // За сколько дней до дедлайна отправлять уведомления

// ===== ОГРАНИЧЕНИЯ ДАННЫХ =====
export const MAX_ASSIGNEES_PER_TASK = 10; // Максимальное количество исполнителей на задаче
export const MIN_PLANNED_HOURS = 0.5; // Минимальное количество плановых часов
export const MAX_PLANNED_HOURS = 1000; // Максимальное количество плановых часов
export const MAX_TITLE_LENGTH = 500; // Максимальная длина названия задачи
export const MAX_DESCRIPTION_LENGTH = 10000; // Максимальная длина описания
export const MAX_PROJECT_NAME_LENGTH = 200; // Максимальная длина названия проекта
export const MAX_CODE_LENGTH = 50; // Максимальная длина кода проекта
export const MAX_COMMENT_LENGTH = 1000; // Максимальная длина комментария
export const MAX_NOTIFICATION_TEXT_LENGTH = 1000; // Максимальная длина текста уведомления
export const MAX_POSITION_LENGTH = 200; // Максимальная длина должности
export const MAX_NAME_LENGTH = 100; // Максимальная длина имени/фамилии
export const MAX_PHONE_LENGTH = 20; // Максимальная длина телефона
export const MAX_EXTENSION_LENGTH = 10; // Максимальная длина добавочного номера
export const MAX_TAB_LENGTH = 20; // Максимальная длина табельного номера

// ===== ПОВТОРЯЮЩИЕСЯ ЗАДАЧИ =====
export const MAX_REPEAT_INSTANCES = 100; // Максимальное количество генерируемых повторений
export const REPEAT_TYPES = ['none', 'daily', 'weekly_days', 'workdays', 'monthly', 'yearly', 'custom'];
export const REPEAT_END_TYPES = ['date', 'count'];

// ===== АРХИВАЦИЯ =====
export const MIN_ARCHIVE_MONTHS = 3; // Минимальный срок архивации
export const MAX_ARCHIVE_MONTHS = 24; // Максимальный срок архивации

// ===== РАЗМЕРЫ ФОТО =====
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB - максимальный размер фото

// ===== ПАГИНАЦИЯ И СПИСКИ =====
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ===== КЭШИРОВАНИЕ =====
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 минут - время жизни кэша

// ===== ЛОГИРОВАНИЕ =====
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};
export const DEFAULT_LOG_LEVEL = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development' 
  ? LOG_LEVELS.DEBUG 
  : LOG_LEVELS.WARN;

// ===== UX/UI КОНСТАНТЫ =====
export const MODAL_Z_INDEX = 1000;
export const TOAST_Z_INDEX = 10000;
export const ANIMATION_DURATION_MS = 300; // Стандартная длительность анимаций

// ===== ВАЛИДАЦИЯ EMAIL =====
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const CODE_REGEX = /^[A-Za-z0-9_-]+$/; // Для кодов проектов
export const NAME_REGEX = /^[A-Za-zА-Яа-яЁё\s'-]+$/; // Для имён и фамилий
export const PHONE_REGEX = /^\+?[\d\s()-]{7,20}$/; // Для телефонов
export const EMPLOYEE_ID_REGEX = /^e_[a-zA-Z0-9_]+$/; // Для ID сотрудников
export const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i; // Для UUID
