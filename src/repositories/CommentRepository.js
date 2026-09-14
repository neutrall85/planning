// src/repositories/CommentRepository.js
import { Repository } from './Repository';

export class CommentRepository extends Repository {
  constructor(comments) {
    super(comments);
  }

  /**
   * Все комментарии в рамках фильтра. Фильтр задаёт видимую область:
   * { projectId } — чат проекта, { projectId, taskId } — чат задачи.
   * Комментарий не может «утечь» из-под фильтра — это ключевой инвариант,
   * на который опирается и UI, и поиск.
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
   * Полнотекстовый поиск по тексту комментариев внутри фильтра.
   *
   * Возвращает не только совпадения, но и их родителей — иначе найденный
   * ответ без корня выглядит как сообщение вне диалога. Тот же принцип, что
   * в поисковиках по тредам: контекст важнее краткости.
   */
  search(filter, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.findByFilter(filter);

    const all = this.findByFilter(filter);
    const byId = new Map(all.map(c => [c.id, c]));
    const keep = new Set();

    for (const c of all) {
      if (!c.text.toLowerCase().includes(q)) continue;
      keep.add(c.id);
      let cur = c;
      while (cur.parentId && byId.has(cur.parentId)) {
        cur = byId.get(cur.parentId);
        keep.add(cur.id);
      }
    }

    return all.filter(c => keep.has(c.id));
  }
}