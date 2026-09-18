// src/utils/workCalendar.js
//
// Производственный календарь: какие дни рабочие и сколько часов в рабочем дне.
// Единственное место, где заданы эти правила. Любой модуль, которому нужно
// «сколько рабочих часов в интервале», спрашивает здесь.
//
// Данные о праздниках и сокращённых днях НЕ хранятся в этом модуле - они
// приходят через getYearData(year). Источник - ProductionCalendarService.
//
// Кэш. Обращения к праздникам/сокращённым дням идут на каждый день
// диапазона (год = 365 вызовов). Чтобы не читать репозиторий и не строить
// массивы 365 раз, WorkCalendar держит Map<year, Sets> и сбрасывает её
// только когда меняется версия данных - getDataVersion(). Первый вызов
// за год строит Sets (O(n) по длине списка), все следующие - O(1) через
// Set.has.

import { iso, parseISO, addDays, pad2 } from './date';

const DEFAULT_HOURS_PER_DAY = 8;
const DEFAULT_WEEKEND_DAYS = [0, 6];
const EMPTY_YEAR = { holidays: [], shortDays: [] };

/**
 * Статус календарного дня. Единая точка правды: и isWorkday, и UI
 * (годовой календарь, дашборд) трактуют день через эти значения.
 */
export const DAY_STATUS = Object.freeze({
  WORKDAY:  'workday',
  SHORTDAY: 'shortday',
  WEEKEND:  'weekend',
  HOLIDAY:  'holiday',
});

export class WorkCalendar {
  constructor({
    hoursPerDay = DEFAULT_HOURS_PER_DAY,
    weekendDays = DEFAULT_WEEKEND_DAYS,
    getYearData = null,
    getDataVersion = null,
  } = {}) {
    this._hoursPerDay = hoursPerDay;
    this._weekendDays = new Set(weekendDays);
    this._getYearData = getYearData || (() => EMPTY_YEAR);
    this._getDataVersion = getDataVersion || (() => 0);
    this._cachedVersion = -1;
    this._yearSets = new Map();
  }

  get hoursPerDay() {
    return this._hoursPerDay;
  }

  _setsFor(isoDate) {
    const version = this._getDataVersion();
    if (version !== this._cachedVersion) {
      this._yearSets.clear();
      this._cachedVersion = version;
    }
    const year = Number(isoDate.slice(0, 4));
    let sets = this._yearSets.get(year);
    if (!sets) {
      const raw = this._getYearData(year);
      sets = {
        holidays: new Set(raw.holidays),
        shortDays: new Set(raw.shortDays),
      };
      this._yearSets.set(year, sets);
    }
    return sets;
  }

  isHoliday(isoDate) {
    return this._setsFor(isoDate).holidays.has(isoDate);
  }

  isShortDay(isoDate) {
    return this._setsFor(isoDate).shortDays.has(isoDate);
  }

  /**
   * Статус дня. Единственное место, где решается, к какой категории
   * относится дата. isWorkday и годовой календарь спрашивают здесь, чтобы
   * классификация не разъезжалась.
   */
  statusOf(isoDate) {
    if (this.isHoliday(isoDate)) return DAY_STATUS.HOLIDAY;
    if (this._weekendDays.has(parseISO(isoDate).getDay())) return DAY_STATUS.WEEKEND;
    if (this.isShortDay(isoDate)) return DAY_STATUS.SHORTDAY;
    return DAY_STATUS.WORKDAY;
  }

  isWorkday(isoDate) {
    const status = this.statusOf(isoDate);
    return status === DAY_STATUS.WORKDAY || status === DAY_STATUS.SHORTDAY;
  }

  getWorkdays(fromIso, toIso) {
    const result = [];
    let cursor = parseISO(fromIso);
    const end = parseISO(toIso);
    while (cursor <= end) {
      const day = iso(cursor);
      if (this.isWorkday(day)) result.push(day);
      cursor = addDays(cursor, 1);
    }
    return result;
  }

  countWorkdays(fromIso, toIso) {
    return this.getWorkdays(fromIso, toIso).length;
  }

  /**
   * Нормативная ёмкость периода в часах.
   * Каждый рабочий день даёт hoursPerDay, каждый сокращённый - hoursPerDay − 1.
   */
  capacityHours(fromIso, toIso) {
    const workdays = this.getWorkdays(fromIso, toIso);
    let shortDaysCount = 0;
    for (const day of workdays) {
      if (this.isShortDay(day)) shortDaysCount += 1;
    }
    return workdays.length * this._hoursPerDay - shortDaysCount;
  }

  /**
   * Разбивка года по месяцам с посчитанным статусом каждого дня.
   * Формат - только данные: месяц (0–11) и список дней
   * { iso, day, status }. Никаких подписей и цветов - это в UI.
   */
  describeYear(year) {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const days = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayIso = `${year}-${pad2(m + 1)}-${pad2(d)}`;
        days.push({ iso: dayIso, day: d, status: this.statusOf(dayIso) });
      }
      months.push({ month: m, days });
    }
    return months;
  }
}

export function resolvePeriod(mode, anchorIso, customFrom, customTo) {
  if (mode === 'custom') return { from: customFrom, to: customTo };

  const d = parseISO(anchorIso);
  const y = d.getFullYear();

  if (mode === 'month') {
    const m = d.getMonth();
    return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) };
  }
  if (mode === 'quarter') {
    const q = Math.floor(d.getMonth() / 3);
    return { from: iso(new Date(y, q * 3, 1)), to: iso(new Date(y, q * 3 + 3, 0)) };
  }
  if (mode === 'year') {
    return { from: iso(new Date(y, 0, 1)), to: iso(new Date(y, 11, 31)) };
  }
  return { from: anchorIso, to: anchorIso };
}