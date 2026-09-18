/**
 * Базовый репозиторий.
 *
 * Принимает либо массив, либо пару (getter, setter). Getter - функция
 * без аргументов, возвращающая текущий массив; setter - функция,
 * принимающая новый массив и записывающая его в store.
 *
 * ВАЖНО. Подклассы НЕ объявляют собственный constructor. Пара
 * (getter, setter) обязана доходить до базового класса как есть: если
 * подкласс переопределит сигнатуру одним параметром, setter молча
 * потеряется, save() начнёт мутировать массив на месте, а подписчики
 * стора перестанут видеть изменения (ссылка на срез не меняется).
 * Если подклассу когда-нибудь понадобится собственная инициализация -
 * она обязана вызвать super(...args) без изменения сигнатуры.
 *
 * Когда store работает через пару (getter, setter), save/delete
 * создают новый массив и передают его в setter - это делает срез
 * иммутабельным, и useSyncExternalStore корректно видит изменения.
 *
 * save() не делает short-circuit по ссылочному равенству переданного
 * объекта и элемента в массиве. Такое сравнение не отличает «ничего
 * не менялось» от «вызывающий мутировал объект на месте»: во втором
 * случае store обязан узнать об изменении, а short-circuit это
 * проглатывает. Один лишний slice на no-op save дешевле, чем молча
 * потерянное обновление.
 *
 * Когда setter не передан (in-memory сценарии, тесты, утилитарные
 * репозитории), save/delete мутируют массив на месте.
 */
export class Repository {
  constructor(collectionOrGetter, setter = null) {
    this._get = typeof collectionOrGetter === 'function'
      ? collectionOrGetter
      : () => collectionOrGetter;
    this._set = setter;
  }

  get _collection() {
    return this._get();
  }

  findAll() {
    return this._collection;
  }

  findById(id) {
    return this._collection.find(item => item.id === id) || null;
  }

  save(item) {
    const collection = this._collection;
    const idx = collection.findIndex(i => i.id === item.id);

    if (this._set) {
      if (idx >= 0) {
        const next = collection.slice();
        next[idx] = item;
        this._set(next);
      } else {
        this._set(collection.concat([item]));
      }
      return item;
    }

    if (idx >= 0) collection[idx] = item;
    else collection.push(item);
    return item;
  }

  delete(id) {
    const collection = this._collection;
    const idx = collection.findIndex(i => i.id === id);
    if (idx < 0) return false;

    if (this._set) {
      const next = collection.slice(0, idx).concat(collection.slice(idx + 1));
      this._set(next);
    } else {
      collection.splice(idx, 1);
    }
    return true;
  }

  find(predicate) {
    return this._collection.filter(predicate);
  }

  findOne(predicate) {
    return this._collection.find(predicate) || null;
  }
}