/**
 * Lightweight Logger for Production
 * Simplified version: removed timer groups, history storage, and localStorage.
 * Only logs ERROR to server (mocked) and filters by level.
 * @file
 */

// Уровни логирования
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

// Текущий уровень логирования (по умолчанию INFO для production)
let currentLevel = import.meta.env.PROD ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

// Безопасное преобразование объекта в строку с скрытием чувствительных данных
const safeStringify = (obj) => {
  try {
    if (obj === undefined) return 'undefined';
    if (obj === null) return 'null';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (typeof obj === 'function') return '[Function]';
    
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) return '[Circular]';
        seen.add(value);
      }
      // Скрываем чувствительные данные
      if (key.toLowerCase().includes('pass') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('key')) {
        return '[REDACTED]';
      }
      return value;
    }, 2);
  } catch (e) {
    return '[Stringify Error]';
  }
};

// Основной метод логирования
const log = (level, message, ...args) => {
  if (level < currentLevel) return;
  
  const levelStr = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
  const context = args.length > 0 ? args.map(safeStringify).join(' ') : '';
  
  const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                       level === LOG_LEVELS.WARN ? 'warn' : 'log';
  
  if (context) {
    console[consoleMethod](`[${levelStr}] ${message}`, ...args);
  } else {
    console[consoleMethod](`[${levelStr}] ${message}`);
  }
  
  // Отправка на сервер только для ERROR уровня
  if (level === LOG_LEVELS.ERROR && typeof window !== 'undefined') {
    sendToServer({ level: levelStr, message, context }).catch(() => {
      // Silently fail - don't log errors while logging errors
    });
  }
};

// Отправка логов на сервер (заглушка для production)
const sendToServer = async (logEntry) => {
  // В production использовать реальный сервис мониторинга (Sentry, LogRocket)
  // localStorage больше не используется для хранения ошибок
  if (import.meta.env.PROD) {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logEntry),
    });
  }
};

// Публичный API логгера
export const logger = {
  /**
   * Установка уровня логирования
   * @param {number} level - один из LOG_LEVELS
   */
  setLevel: (level) => {
    currentLevel = level;
  },
  
  /**
   * Получение текущего уровня логирования
   */
  getLevel: () => currentLevel,
  
  /**
   * Логирование отладочных сообщений
   */
  debug: (message, ...args) => log(LOG_LEVELS.DEBUG, message, ...args),
  
  /**
   * Логирование информационных сообщений
   */
  info: (message, ...args) => log(LOG_LEVELS.INFO, message, ...args),
  
  /**
   * Логирование предупреждений
   */
  warn: (message, ...args) => log(LOG_LEVELS.WARN, message, ...args),
  
  /**
   * Логирование ошибок
   */
  error: (message, ...args) => log(LOG_LEVELS.ERROR, message, ...args),
  
  /**
   * Логирование ошибки с контекстом
   * @param {Error} error - объект ошибки
   * @param {string} message - дополнительное сообщение
   * @param {Object} context - контекст ошибки
   */
  errorWithStack: (error, message = '', context = {}) => {
    const errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
    logger.error(`${message} ${error.name}: ${error.message}`, {
      ...context,
      error: errorInfo,
    });
  },
};

// Перехват глобальных ошибок
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logger.errorWithStack(
      event.error || new Error(event.message),
      '[Global Error]',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message,
      }
    );
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('[Unhandled Promise Rejection]', {
      reason: event.reason,
      type: event.reason?.constructor?.name,
    });
  });
}

export default logger;
