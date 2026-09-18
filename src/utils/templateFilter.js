// src/utils/templateFilter.js
/**
 * Фильтр списка шаблонов.
 *
 * Инкапсулирует набор правил фильтрации в одном месте: тип шаблона,
 * принадлежность, текстовый поиск. Чистый класс без состояния React -
 * по образцу CommentPolicy; экземпляр создаётся один раз и применяется
 * к разным срезам списка.
 *
 * Собственная принадлежность («мои» / «общие») вычисляется по userId,
 * который известен конструктору. Вызывающий код передаёт только
 * критерии - без повторной логики «чей это шаблон».
 */
export class TemplateFilter {
  constructor(userId) {
    this.userId = userId;
  }

  /**
   * Применить фильтр к списку.
   *
   * @param {object[]} list - исходный массив шаблонов
   * @param {object}   criteria
   * @param {string}   criteria.kind      - 'all' | 'task' | 'project'
   * @param {string}   criteria.ownership - 'all' | 'mine' | 'shared'
   * @param {string}   criteria.query     - подстрока для поиска по имени
   * @returns {object[]}
   */
  apply(list, criteria) {
    const { kind = 'all', ownership = 'all', query = '' } = criteria;
    const q = query.trim().toLowerCase();

    return list.filter(t => {
      if (kind !== 'all' && t.kind !== kind) return false;
      if (ownership === 'mine' && t.ownerId !== this.userId) return false;
      if (ownership === 'shared' && !t.isShared) return false;
      if (q && !t.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }
}