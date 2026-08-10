/**
 * Константы для конфигурации приложения
 */

// Интервалы времени в миллисекундах
export const DEADLINE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 часа
export const ARCHIVE_AFTER_MONTHS = 3; // Месяцев до архивации задач
export const COMMENT_EDIT_WINDOW = 15 * 60000; // 15 минут на редактирование комментария

// Настройки безопасности
export const PASSWORD_MIN_LENGTH = 8;
export const MAX_LOGIN_ATTEMPTS = 5;
export const ACCOUNT_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 минут

// Настройки сессии
export const SESSION_COOKIE_MAX_AGE_DAYS = 30;

// Домен компании
export const DOMAIN = "volga-dnepr.com";

// Час проверки дедлайнов (по Москве)
export const DEADLINE_CHECK_HOUR_MOSCOW = 7;
