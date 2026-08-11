/**
 * DataService - работа с данными (CRUD через API, кэширование)
 * Отвечает только за хранение и предоставление данных, без бизнес-логики
 */

import { buildMockData } from '../mocks/dataMock';

export default class DataService {
  constructor(initialData = null) {
    this._data = initialData || buildMockData();
    this._listeners = [];
    this._cache = new Map();
    this._cacheTimestamps = new Map();
    this._cacheTTL = 5 * 60 * 1000; // 5 минут по умолчанию
  }

  /**
   * Инициализация данных
   * @param {Object} initialData - начальные данные
   */
  initialize(initialData) {
    if (!initialData || typeof initialData !== 'object') {
      throw new Error('Invalid initial data');
    }
    this._data = { ...initialData };
    this._notify();
  }

  /**
   * Подписка на изменения данных
   * @param {Function} callback - функция обратного вызова
   * @returns {Function} функция отписки
   */
  subscribe(callback) {
    this._listeners.push(callback);
    return () => {
      this._listeners = this._listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Уведомление подписчиков об изменениях
   */
  _notify() {
    this._listeners.forEach(cb => cb(this._data));
  }

  /**
   * Получение всех данных
   * @returns {Object} копия данных
   */
  getData() {
    return { ...this._data };
  }

  /**
   * Установка всех данных (для загрузки из API)
   * @param {Object} newData - новые данные
   */
  setData(newData) {
    if (!newData || typeof newData !== 'object') {
      throw new Error('Invalid data provided to setData');
    }
    this._data = { ...newData };
    this._clearCache();
    this._notify();
  }

  /**
   * Частичное обновление данных
   * @param {string} collection - имя коллекции (tasks, projects, etc.)
   * @param {Array} items - массив элементов для замены
   */
  updateCollection(collection, items) {
    if (!this._data || !Array.isArray(this._data[collection])) {
      throw new Error(`Collection ${collection} not found`);
    }
    this._data = {
      ...this._data,
      [collection]: [...items]
    };
    this._clearCache();
    this._notify();
  }

  // === Геттеры для коллекций ===

  getTasks() {
    return this._getCached('tasks', () => this._data?.tasks || []);
  }

  getProjects() {
    return this._getCached('projects', () => this._data?.projects || []);
  }

  getEmployees() {
    return this._getCached('employees', () => this._data?.employees || []);
  }

  getVacations() {
    return this._getCached('vacations', () => this._data?.vacations || []);
  }

  getDepartments() {
    return this._getCached('departments', () => this._data?.departments || []);
  }

  getKbs() {
    return this._getCached('kbs', () => this._data?.kbs || []);
  }

  getNotifications() {
    return this._getCached('notifications', () => this._data?.notifications || []);
  }

  getAudit() {
    return this._getCached('audit', () => this._data?.audit || []);
  }

  getRoleDelegations() {
    return this._getCached('roleDelegations', () => this._data?.roleDelegations || []);
  }

  getSettings() {
    return this._data?.settings || {};
  }

  /**
   * Получение элемента по ID из коллекции
   * @param {string} collection - имя коллекции
   * @param {string} id - ID элемента
   * @returns {Object|undefined} элемент или undefined
   */
  getById(collection, id) {
    const items = this[collection.charAt(0).toUpperCase() + collection.slice(1, -1) + 's']?.() || [];
    return items.find(item => item.id === id);
  }

  /**
   * Поиск элемента в коллекции по условию
   * @param {string} collection - имя коллекции
   * @param {Function} predicate - функция предикат
   * @returns {Object|undefined} найденный элемент или undefined
   */
  findInCollection(collection, predicate) {
    const items = this[`get${collection.charAt(0).toUpperCase() + collection.slice(1)}`]?.() || [];
    return items.find(predicate);
  }

  // === Кэширование ===

  /**
   * Получение данных из кэша или вычисление
   * @param {string} key - ключ кэша
   * @param {Function} computeFn - функция вычисления
   * @returns {*} результат
   */
  _getCached(key, computeFn) {
    const now = Date.now();
    const cachedTime = this._cacheTimestamps.get(key);
    
    if (cachedTime && (now - cachedTime) < this._cacheTTL) {
      const cached = this._cache.get(key);
      // Возвращаем копию для предотвращения мутаций
      return Array.isArray(cached) ? [...cached] : { ...cached };
    }

    const result = computeFn();
    this._cache.set(key, result);
    this._cacheTimestamps.set(key, now);
    
    // Возвращаем копию
    return Array.isArray(result) ? [...result] : { ...result };
  }

  /**
   * Очистка кэша
   * @param {string|null} key - ключ для очистки или null для полной очистки
   */
  _clearCache(key = null) {
    if (key) {
      this._cache.delete(key);
      this._cacheTimestamps.delete(key);
    } else {
      this._cache.clear();
      this._cacheTimestamps.clear();
    }
  }

  /**
   * Установка времени жизни кэша
   * @param {number} ttlMs - время жизни в миллисекундах
   */
  setCacheTTL(ttlMs) {
    this._cacheTTL = ttlMs;
  }

  /**
   * Принудительная инвалидация кэша коллекции
   * @param {string} collectionName - имя коллекции
   */
  invalidateCollection(collectionName) {
    this._clearCache(collectionName);
  }
}
