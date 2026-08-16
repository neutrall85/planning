/**
 * Утилиты для работы с датами
 */

/**
 * Дополнение числа до 2 знаков
 */
export const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * Форматирование даты в ISO (YYYY-MM-DD)
 */
export const iso = (d: Date): string => 
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/**
 * Добавление дней к дате
 */
export const addDays = (d: Date | string, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/**
 * Добавление месяцев к дате
 */
export const addMonths = (d: Date | string, n: number): Date => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
};

/**
 * Добавление лет к дате
 */
export const addYears = (d: Date | string, n: number): Date => {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + n);
  return x;
};

/**
 * Парсинг ISO строки в Date
 */
export const parseISO = (s: string): Date => {
  // Поддерживаем как полные ISO-строки (YYYY-MM-DDTHH:mm:ss.sssZ), так и даты (YYYY-MM-DD)
  const dateStr = String(s).split('T')[0];
  if (!dateStr) {
    return new Date(NaN);
  }
  const parts = dateStr.split('-').map(Number);
  const [y, m, d] = parts;
  if (y === undefined || m === undefined || d === undefined) {
    return new Date(NaN);
  }
  return new Date(y, m - 1, d);
};

/**
 * Текущая дата в ISO формате
 */
export const TODAY = iso(new Date());

/**
 * Разница между датами в днях
 */
export const daysDiff = (a: string, b: string): number => {
  const dateA = parseISO(a);
  const dateB = parseISO(b);
  if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
  return Math.floor((dateB.getTime() - dateA.getTime()) / 86400000);
};

/**
 * Краткие названия месяцев
 */
export const MS_SHORT: string[] = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

/**
 * Полные названия месяцев
 */
export const MS_FULL: string[] = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/**
 * Названия дней недели
 */
export const WD_FULL: string[] = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

/**
 * Форматирование даты (день месяц)
 */
export const fmtD = (s?: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MS_SHORT[d.getMonth()]}`;
};

/**
 * Форматирование даты (ДД.ММ.ГГГГ)
 */
export const fmtDMY = (s?: string | null): string => {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/**
 * Форматирование даты и времени
 */
export const fmtDT = (ts?: number | null): string => {
  if (ts === undefined || ts === null) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return `${fmtDMY(iso(d))} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

/**
 * Форматирование полной даты
 */
export const fmtFullDate = (dateStr?: string | null): string => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return '—';
  const dayName = WD_FULL[d.getDay()] ?? '';
  const day = d.getDate();
  const month = (MS_FULL[d.getMonth()] ?? '').toLowerCase();
  const year = d.getFullYear();
  return `${dayName}, ${day} ${month} ${year}`;
};

/**
 * Генерация уникального ID
 */
export const uid = (): string => Math.random().toString(36).slice(2, 10);

/**
 * Инициалы из имени и фамилии
 */
export const initials = (f?: string, l?: string): string => 
  `${(f || '?')[0]}${(l || '?')[0]}`;

/**
 * Проверка активности задачи
 */
export const isTaskActive = (task?: { archived?: boolean; closedAt?: string } | null): boolean => {
  if (!task) return false;
  if (!task.archived) return true;
  if (task.closedAt) {
    const cutoff = addMonths(new Date(), -3);
    return task.closedAt >= iso(cutoff);
  }
  return false;
};
