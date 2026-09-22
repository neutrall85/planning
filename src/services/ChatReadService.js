/**
 * Отметки «прочитано до» по чатам проектов и задач.
 *
 * Хранит одну запись на пару (пользователь, чат). Отметка двигается
 * только вперёд: параллельные закрытия модалки и открытия вкладки
 * не «откатывают» прочитанное.
 *
 * Журнал аудита и уведомления сервис не трогает — это техническая
 * отметка, а не действие пользователя, которое стоит фиксировать.
 */
export class ChatReadService {
  constructor({ chatReadRepo, notify }) {
    this._repo = chatReadRepo;
    this._notify = notify;
  }

  /** Timestamp последнего прочтения. 0 — пользователь ещё не открывал чат. */
  getLastReadAt(userId, key) {
    if (!userId || !key) return 0;
    const entry = this._repo.findById(`${userId}|${key}`);
    return entry ? entry.lastReadAt : 0;
  }

  /** Сдвигает отметку вперёд. Идемпотентно, если ts не новее текущей. */
  markRead(userId, key, ts) {
    if (!userId || !key) return null;
    const id = `${userId}|${key}`;
    const existing = this._repo.findById(id);
    if (existing && existing.lastReadAt >= ts) return existing;
    const entry = { id, userId, chatKey: key, lastReadAt: ts };
    this._repo.save(entry);
    return entry;
  }
}