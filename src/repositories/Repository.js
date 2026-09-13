// src/repositories/Repository.js
export class Repository {
  constructor(collection) {
    this._collection = collection;
  }

  findAll() {
    return this._collection;
  }

  findById(id) {
    return this._collection.find(item => item.id === id) || null;
  }

  save(item) {
    const idx = this._collection.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      this._collection[idx] = item;
    } else {
      this._collection.push(item);
    }
    return item;
  }

  delete(id) {
    const idx = this._collection.findIndex(i => i.id === id);
    if (idx >= 0) {
      this._collection.splice(idx, 1);
      return true;
    }
    return false;
  }

  // вспомогательные методы
  find(predicate) {
    return this._collection.filter(predicate);
  }

  findOne(predicate) {
    return this._collection.find(predicate) || null;
  }
}