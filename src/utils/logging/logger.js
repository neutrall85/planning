/**
 * Централизованная система логирования для фронтенда
 * Поддерживает уровни логирования, форматирование и отправку на сервер
 * @file
 */

// Уровни логирования
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  NONE: 4,
};

// Текущий уровень логирования (можно менять в runtime)
let currentLevel = LOG_LEVELS.DEBUG;

// История логов для отладки (ограничена по размеру)
const MAX_LOG_HISTORY = 1000;
const logHistory = [];

// Форматирование временной метки
const formatTimestamp = () => {
  const now = new Date();
  return now.toISOString();
};

// Форматирование уровня логирования
const formatLevel = (level) => {
  const levelNames = {
    [LOG_LEVELS.DEBUG]: 'DEBUG',
    [LOG_LEVELS.INFO]: 'INFO',
    [LOG_LEVELS.WARN]: 'WARN',
    [LOG_LEVELS.ERROR]: 'ERROR',
  };
  return levelNames[level] || 'UNKNOWN';
};

// Безопасное преобразование объекта в строку
const safeStringify = (obj) => {
  try {
    if (obj === undefined) return 'undefined';
    if (obj === null) return 'null';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
    if (typeof obj === 'function') return '[Function]';
    
    // Избегаем циклических ссылок
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
    return '[Stringify Error: ' + e.message + ']';
  }
};

// Получение информации о стеке вызовов
const getCallerInfo = () => {
  const error = new Error();
  const stack = error.stack?.split('\n') || [];
  // Пропускаем первые кадры стека (логгер и обертки)
  const callerFrame = stack[3] || stack[2];
  if (!callerFrame) return 'unknown';
  
  const match = callerFrame.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/) || 
                callerFrame.match(/at\s+(.+):(\d+):(\d+)/);
  if (match) {
    const fileName = match[2] || match[1];
    const lineNum = match[3] || match[2];
    return `${fileName}:${lineNum}`;
  }
  return 'unknown';
};

// Основной метод логирования
const log = (level, message, ...args) => {
  if (level < currentLevel) return;
  
  const timestamp = formatTimestamp();
  const levelStr = formatLevel(level);
  const location = getCallerInfo();
  const context = args.length > 0 ? args.map(safeStringify).join(' ') : '';
  
  const logEntry = {
    timestamp,
    level: levelStr,
    location,
    message: String(message),
    context: context || undefined,
  };
  
  // Добавляем в историю
  if (logHistory.length >= MAX_LOG_HISTORY) {
    logHistory.shift();
  }
  logHistory.push(logEntry);
  
  // Вывод в консоль с цветным форматированием
  const colorMap = {
    [LOG_LEVELS.DEBUG]: '#8b5cf6',
    [LOG_LEVELS.INFO]: '#2196F3',
    [LOG_LEVELS.WARN]: '#f59e0b',
    [LOG_LEVELS.ERROR]: '#ef4444',
  };
  
  const color = colorMap[level] || '#666';
  const consoleMethod = level === LOG_LEVELS.ERROR ? 'error' : 
                       level === LOG_LEVELS.WARN ? 'warn' : 'log';
  
  console[consoleMethod](
    `%c[${timestamp}] ${levelStr} [${location}]`,
    `color: ${color}; font-weight: bold;`,
    message,
    ...args
  );
  
  // Отправка на сервер (для ERROR и WARN уровней)
  if (level >= LOG_LEVELS.WARN && typeof window !== 'undefined') {
    sendToServer(logEntry).catch(err => {
      console.error('[Logger] Failed to send log to server:', err);
    });
  }
};

// Отправка логов на сервер (заглушка, заменить на реальный API)
const sendToServer = async (logEntry) => {
  // TODO: Заменить на реальный endpoint логирования
  // Пример: await fetch('/api/logs', { method: 'POST', body: JSON.stringify(logEntry) });
  
  // Для демонстрации - сохраняем в localStorage при ошибках
  if (logEntry.level === 'ERROR') {
    try {
      const storedLogs = JSON.parse(localStorage.getItem('app_error_logs') || '[]');
      storedLogs.push(logEntry);
      // Храним только последние 100 ошибок
      while (storedLogs.length > 100) storedLogs.shift();
      localStorage.setItem('app_error_logs', JSON.stringify(storedLogs));
    } catch {
      // Игнорируем ошибки сохранения
    }
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
    logger.info(`Log level set to ${formatLevel(level)}`);
  },
  
  /**
   * Получение текущего уровня логирования
   */
  getLevel: () => currentLevel,
  
  /**
   * Получение истории логов
   * @param {number} limit - максимальное количество записей
   */
  getHistory: (limit = 100) => logHistory.slice(-limit),
  
  /**
   * Очистка истории логов
   */
  clearHistory: () => {
    logHistory.length = 0;
  },
  
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
  
  /**
   * Логирование времени выполнения операции
   * @param {string} label - метка для идентификации
   * @returns {Function} функция для остановки таймера
   */
  startTimer: (label) => {
    const startTime = performance.now();
    logger.debug(`[Timer Start] ${label}`);
    
    return () => {
      const endTime = performance.now();
      const duration = (endTime - startTime).toFixed(2);
      logger.info(`[Timer End] ${label}: ${duration}ms`);
      return duration;
    };
  },
  
  /**
   * Группировка логов (обертка над console.group)
   * @param {string} label - метка группы
   * @param {Function} callback - функция, выполняемая в группе
   */
  group: (label, callback) => {
    console.group(label);
    try {
      callback();
    } finally {
      console.groupEnd();
    }
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
