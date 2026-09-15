// src/repositories/CommentRepository.js
import { Repository } from './Repository';

const textMatches = (text, query) =>
  String(text || '').toLowerCase().includes(query);

export class CommentRepository extends Repository {
  constructor(comments) {
    super(comments);
  }

  /**
   * Все комментарии в рамках фильтра. Фильтр задаёт видимую область:
   * { projectId } — чат проекта, { projectId, taskId } — чат задачи.
   */
  findByFilter(filter = {}) {
    return this.find(c => {
      if (filter.projectId && c.projectId !== filter.projectId) return false;
      if (filter.taskId !== undefined && c.taskId !== filter.taskId) return false;
      return true;
    });
  }

  findRootsByFilter(filter = {}) {
    return this.findByFilter(filter).filter(c => !c.parentId);
  }

  findChildren(parentId) {
    return this.find(c => c.parentId === parentId);
  }

  /**
   * Полнотекстовый поиск. Возвращает совпадения И их родителей — чтобы
   * найденный ответ не выглядел сиротой в дереве. Длину этого массива
   * нельзя использовать как счётчик совпадений — для этого findMatches.
   */
  search(filter, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.findByFilter(filter);

    const all = this.findByFilter(filter);
    const byId = new Map(all.map(c => [c.id, c]));
    const keep = new Set();

    for (const c of all) {
      if (!textMatches(c.text, q)) continue;
      keep.add(c.id);
      let cur = c;
      while (cur.parentId && byId.has(cur.parentId)) {
        cur = byId.get(cur.parentId);
        keep.add(cur.id);
      }
    }

    return all.filter(c => keep.has(c.id));
  }

  /**
   * Только фактические совпадения, без родителей. Единая точка правды
   * для «кто совпал» — счётчик в UI и навигация по найденным берут
   * данные отсюда.
   */
  findMatches(filter, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];
    return this.findByFilter(filter).filter(c => textMatches(c.text, q));
  }
}