/**
 * Lightweight Logger for Production
 * Simplified version: removed timer groups, history storage, and localStorage.
 * Only logs ERROR to server (mocked) and filters by level.
 */

// Уровни логирования
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];

interface LogEntry {
  level: string;
  message: string;
  context?: string;
}

// Текущий уровень логирования (по умолчанию INFO для production)
let currentLevel: LogLevel = (import.meta as any).env?.PROD ? LOG_LEVELS.INFO : LOG_LEVELS.DEBUG;

// Безопасное преобразование объекта в строку с скрытием чувствительных данных
const safeStringify = (obj: unknown): string => {
  try {
    if (obj === undefined) return 'undefined';
    if (obj === null) return 'null';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (typeof obj === 'function') return '[Function]';
    
    const seen = new WeakSet<object>();
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
  } catch {
    return '[Stringify Error]';
  }
};

// Основной метод логирования
const log = (level: LogLevel, message: string, ...args: unknown[]): void => {
  if (level < currentLevel) return;
  
  const levelStr = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key as keyof typeof LOG_LEVELS] === level) || 'UNKNOWN';
  const context = args.length > 0 ? args.map(safeStringify).join(' ') : '';
  
  const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                       level === LOG_LEVELS.WARN ? 'warn' : 'log';
  
  if (context) {
    (console as any)[consoleMethod](`[${levelStr}] ${message}`, ...args);
  } else {
    (console as any)[consoleMethod](`[${levelStr}] ${message}`);
  }
  
  // Отправка на сервер только для ERROR уровня
  if (level === LOG_LEVELS.ERROR && typeof window !== 'undefined') {
    sendToServer({ level: levelStr, message, context }).catch(() => {
      // Silently fail - don't log errors while logging errors
    });
  }
};

// Отправка логов на сервер (заглушка для production)
const sendToServer = async (logEntry: LogEntry): Promise<void> => {
  // В production использовать реальный сервис мониторинга (Sentry, LogRocket)
  // localStorage больше не используется для хранения ошибок
  if ((import.meta as any).env?.PROD) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(logEntry),
      });
    } catch {
      // Silently fail - don't log errors while logging errors
    }
  }
};

// Публичный API логгера
export const logger = {
  /**
   * Установка уровня логирования
   */
  setLevel: (level: LogLevel): void => {
    currentLevel = level;
  },
  
  /**
   * Получение текущего уровня логирования
   */
  getLevel: (): LogLevel => currentLevel,
  
  /**
   * Логирование отладочных сообщений
   */
  debug: (message: string, ...args: unknown[]): void => log(LOG_LEVELS.DEBUG, message, ...args),
  
  /**
   * Логирование информационных сообщений
   */
  info: (message: string, ...args: unknown[]): void => log(LOG_LEVELS.INFO, message, ...args),
  
  /**
   * Логирование предупреждений
   */
  warn: (message: string, ...args: unknown[]): void => log(LOG_LEVELS.WARN, message, ...args),
  
  /**
   * Логирование ошибок
   */
  error: (message: string, ...args: unknown[]): void => log(LOG_LEVELS.ERROR, message, ...args),
  
  /**
   * Логирование ошибки с контекстом
   */
  errorWithStack: (error: Error, message = '', context: Record<string, unknown> = {}): void => {
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
      type: (event.reason as Error)?.constructor?.name,
    });
  });
}

export default logger;
