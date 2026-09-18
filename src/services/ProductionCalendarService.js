// src/services/ProductionCalendarService.js
import { PRODUCTION_CALENDAR_SEED } from '../utils/productionCalendarSeed';
import { fmtDMY } from '../utils/date';

const STORAGE_KEY = 'production-calendar';
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Управление производственным календарём: чтение, редактирование,
 * персистентность.
 *
 * Персистентность - в localStorage. Это осознанное исключение: календарь
 * не бизнес-сущность (в отличие от задач и проектов), он конфигурация,
 * и должен переживать перезагрузку, тогда как mock data сбрасывается.
 *
 * version увеличивается на каждой мутации. По нему WorkCalendar
 * инвалидирует свой кэш разобранных Sets - так данные не приходится
 * перечитывать и парсить на каждый день диапазона.
 *
 * Сервис не знает, как календарь применяется; WorkCalendar не знает,
 * откуда данные. Их связывает DataStore через геттеры.
 *
 * Про userId. Все мутации принимают currentUserId - id того, кто
 * вызвал изменение. Сервис сам сессию не резолвит: это ответственность
 * DataStore, единственного слоя, знающего про AuthService.
 *
 * Даты в сообщениях об ошибках - в формате ДД.ММ.ГГГГ: они уходят
 * напрямую в тост, а ISO-формат пользователю чужд.
 */
export class ProductionCalendarService {
  constructor({ repo, auditService, notify }) {
    this._repo = repo;
    this._audit = auditService;
    this._notify = notify;
    this._version = 0;
    this._bootstrap();
  }

  get version() {
    return this._version;
  }

  // ---------- Публичное API ----------

  getAll() {
    return [...this._repo.findAll()].sort((a, b) => a.year - b.year);
  }

  getYearData(year) {
    return this._repo.findByYear(year)
      || { year, holidays: [], shortDays: [] };
  }

  addYear(year, currentUserId) {
    this._validateYear(year);
    if (this._repo.findByYear(year)) {
      throw new Error(`Год ${year} уже есть в календаре`);
    }
    this._repo.saveByYear({ year, holidays: [], shortDays: [] });
    this._audit.addAudit(
      'Создание производственного календаря',
      `Год ${year}`,
      'productionCalendar',
      String(year),
      currentUserId,
    );
    this._commit();
  }

  removeYear(year, currentUserId) {
    if (!this._repo.findByYear(year)) return;
    this._repo.deleteByYear(year);
    this._audit.addAudit(
      'Удаление производственного календаря',
      `Год ${year}`,
      'productionCalendar',
      String(year),
      currentUserId,
    );
    this._commit();
  }

  /**
   * Добавляет сразу несколько дат в один список. Атомарно: если хотя бы
   * одна дата не проходит валидацию, уже присутствует или дублируется
   * внутри ввода - метод бросает исключение и ничего не сохраняет.
   *
   * Один аудит на весь батч, один _commit() → один ре-рендер дашборда,
   * даже если дат пришло десять.
   *
   * @param {number} year
   * @param {'holidays'|'shortDays'} kind
   * @param {string[]} dates - ISO-строки 'YYYY-MM-DD'
   * @param {string} currentUserId - id того, кто внёс правку
   */
  addDays(year, kind, dates, currentUserId) {
    this._validateKind(kind);
    if (!Array.isArray(dates) || dates.length === 0) return null;

    const entry = this._repo.findByYear(year);
    if (!entry) throw new Error(`Год ${year} не найден в календаре`);

    const other = kind === 'holidays' ? 'shortDays' : 'holidays';
    const existing = new Set(entry[kind]);
    const otherSet = new Set(entry[other]);
    const seen = new Set();
    const toAdd = [];

    for (const date of dates) {
      this._validateDate(date, year);
      if (existing.has(date)) throw new Error(`Дата ${fmtDMY(date)} уже добавлена`);
      if (otherSet.has(date)) throw new Error(`Дата ${fmtDMY(date)} уже отмечена в другом списке`);
      if (seen.has(date)) throw new Error(`Дата ${fmtDMY(date)} продублирована в вводе`);
      seen.add(date);
      toAdd.push(date);
    }

    if (toAdd.length === 0) return entry;

    const updated = { ...entry, [kind]: [...entry[kind], ...toAdd].sort() };
    this._repo.saveByYear(updated);
    this._audit.addAudit(
      'Изменение производственного календаря',
      { year, kind, action: 'add', dates: toAdd },
      'productionCalendar',
      String(year),
      currentUserId,
    );
    this._commit();
    return updated;
  }

  removeDay(year, kind, date, currentUserId) {
    this._validateKind(kind);
    const entry = this._repo.findByYear(year);
    if (!entry) return;
    if (!entry[kind].includes(date)) return;
    const updated = { ...entry, [kind]: entry[kind].filter(d => d !== date) };
    this._repo.saveByYear(updated);
    this._audit.addAudit(
      'Изменение производственного календаря',
      { year, kind, date, action: 'remove' },
      'productionCalendar',
      String(year),
      currentUserId,
    );
    this._commit();
    return updated;
  }

  // ---------- Внутренние ----------

  _commit() {
    this._version += 1;
    this._persist();
    this._notify();
  }

  /**
   * Восстановление состояния при старте.
   *
   * Три различимых случая:
   *   1. Ключа в localStorage нет - первый запуск, сидируем.
   *   2. Ключ есть, JSON валиден, массив (в том числе пустой) - восстанавливаем
   *      как есть. Пустой массив - это осознанный результат «админ удалил
   *      все годы»: пересоздавать из сида нельзя, иначе удаление «не работает».
   *   3. Ключ есть, но JSON повреждён или это не массив - восстанавливаем из сида.
   */
  _bootstrap() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      this._seed();
      return;
    }

    if (raw === null) {
      this._seed();
      return;
    }

    try {
      const years = JSON.parse(raw);
      if (Array.isArray(years)) {
        years.forEach(y => this._repo.saveByYear({
          year: y.year,
          holidays: Array.isArray(y.holidays) ? [...y.holidays] : [],
          shortDays: Array.isArray(y.shortDays) ? [...y.shortDays] : [],
        }));
        return;
      }
    } catch {
      // Повреждённый JSON - восстановим из сида.
    }

    this._seed();
  }

  _seed() {
    PRODUCTION_CALENDAR_SEED.forEach(y => this._repo.saveByYear({
      year: y.year,
      holidays: [...y.holidays],
      shortDays: [...y.shortDays],
    }));
    this._persist();
  }

  _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._repo.findAll()));
    } catch {
      // Квота или приватный режим - не критично, календарь работает в памяти.
    }
  }

  _validateYear(year) {
    if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
      throw new Error(`Год должен быть целым числом ${MIN_YEAR}–${MAX_YEAR}`);
    }
  }

  _validateKind(kind) {
    if (kind !== 'holidays' && kind !== 'shortDays') {
      throw new Error('Недопустимый тип дня');
    }
  }

  _validateDate(date, year) {
    if (!ISO_DATE_RE.test(date)) {
      throw new Error('Некорректный формат даты');
    }
    if (Number(date.slice(0, 4)) !== year) {
      throw new Error(`Дата ${fmtDMY(date)} не относится к ${year} году`);
    }
    const [y, m, d] = date.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) {
      throw new Error(`Даты ${fmtDMY(date)} не существует`);
    }
  }
}