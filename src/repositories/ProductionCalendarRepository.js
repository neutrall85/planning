// src/repositories/ProductionCalendarRepository.js
//
// Репозиторий производственного календаря. Ключ - год, поэтому
// наследование от Repository не подходит (там id). Тот же контракт
// (collectionOrGetter, setter) - чтобы работал с иммутабельным
// DataStore.
export class ProductionCalendarRepository {
  constructor(yearsOrGetter, setter = null) {
    this._get = typeof yearsOrGetter === 'function'
      ? yearsOrGetter
      : () => yearsOrGetter;
    this._set = setter;
  }

  get _collection() {
    return this._get();
  }

  findAll() {
    return this._collection;
  }

  findByYear(year) {
    return this._collection.find(e => e.year === year) || null;
  }

  saveByYear(entry) {
    const collection = this._collection;
    const idx = collection.findIndex(e => e.year === entry.year);

    if (this._set) {
      if (idx >= 0) {
        if (collection[idx] === entry) return entry;
        const next = collection.slice();
        next[idx] = entry;
        this._set(next);
      } else {
        this._set(collection.concat([entry]));
      }
      return entry;
    }

    if (idx >= 0) collection[idx] = entry;
    else collection.push(entry);
    return entry;
  }

  deleteByYear(year) {
    const collection = this._collection;
    const idx = collection.findIndex(e => e.year === year);
    if (idx < 0) return false;

    if (this._set) {
      const next = collection.slice(0, idx).concat(collection.slice(idx + 1));
      this._set(next);
    } else {
      collection.splice(idx, 1);
    }
    return true;
  }
}