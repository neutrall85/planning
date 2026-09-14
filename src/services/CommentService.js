// src/services/CommentService.js
import { uid } from '../utils/date';

const ALLOWED_REACTIONS = new Set(['👍', '✅']);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export class CommentService {
  constructor(commentRepo, notificationService, auditService, notifyCallback) {
    this._commentRepo = commentRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notifyCallback;
  }

  /**
   * Возвращает комментарии в рамках фильтра. Если передан search,
   * поиск идёт через CommentRepository.search — с сохранением контекста
   * треда (родитель совпадения остаётся в выборке).
   */
  getComments(filter = {}) {
    const list = filter.search
      ? this._commentRepo.search(filter, filter.search)
      : this._commentRepo.findByFilter(filter);
    return this._sort(list);
  }

  _sort(list) {
    return [...list].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.createdAt - a.createdAt;
    });
  }

  addComment(data) {
    const comment = {
      id: uid(),
      projectId: data.projectId,
      taskId: data.taskId || null,
      parentId: data.parentId || null,
      authorId: data.authorId,
      text: data.text || '',
      attachments: data.attachments || [],
      reactions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    this._commentRepo.save(comment);
    this._notifications.notifyComment(comment);
    this._notify();
    return comment;
  }

  updateComment(id, newText) {
    const comment = this._commentRepo.findById(id);
    if (!comment) throw new Error('Комментарий не найден');
    comment.text = newText;
    comment.updatedAt = Date.now();
    this._commentRepo.save(comment);
    this._notify();
    return comment;
  }

  /** Рекурсивно удаляет комментарий и все его ответы. */
  deleteComment(id) {
    const toDelete = new Set([id]);
    const collect = (parentId) => {
      for (const c of this._commentRepo.findChildren(parentId)) {
        if (!toDelete.has(c.id)) {
          toDelete.add(c.id);
          collect(c.id);
        }
      }
    };
    collect(id);
    for (const cid of toDelete) this._commentRepo.delete(cid);
    this._notify();
  }

  togglePin(commentId, actorId) {
    const comment = this._commentRepo.findById(commentId);
    if (!comment) throw new Error('Комментарий не найден');
    comment.pinned = !comment.pinned;
    this._commentRepo.save(comment);
    this._notify();
    this._audit.addAudit(
      comment.pinned ? 'Закрепление комментария' : 'Открепление комментария',
      {
        commentId: comment.id,
        text: comment.text.substring(0, 50) + (comment.text.length > 50 ? '...' : ''),
        projectId: comment.projectId,
        taskId: comment.taskId,
      },
      'comment', comment.id, actorId || 'system'
    );
    return comment;
  }

  /**
   * Переключение реакции. Набор допустимых эмодзи фиксирован — клиент
   * не может записать в state произвольную строку. Это защита от stored XSS
   * через текст реакции и от обхода логики уведомлений произвольными символами.
   *
   * Инвариант: у одного пользователя не более одной реакции одного типа
   * на комментарий. Хранится как { [emoji]: userId[] }; пустой массив
   * удаляется, чтобы не мусорить в state.
   */
  toggleReaction(commentId, userId, emoji) {
    if (!ALLOWED_REACTIONS.has(emoji)) {
      throw new Error('Недопустимая реакция');
    }
    const comment = this._commentRepo.findById(commentId);
    if (!comment) throw new Error('Комментарий не найден');

    comment.reactions = comment.reactions || {};
    const list = comment.reactions[emoji] || [];
    const idx = list.indexOf(userId);

    if (idx >= 0) {
      const next = list.filter(id => id !== userId);
      if (next.length === 0) delete comment.reactions[emoji];
      else comment.reactions[emoji] = next;
    } else {
      comment.reactions[emoji] = [...list, userId];
    }

    this._commentRepo.save(comment);
    this._notify();
    return comment;
  }

  /**
   * Читает файл как вложение комментария.
   * Сознательно уже, чем allowlist FileManager: в чат допускаются только
   * изображения ограниченного размера. Архивы и документы в чате
   * усложняют историю и не нужны по бизнес-логике.
   */
  createAttachment(file) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Можно загружать только изображения');
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`Размер не более ${MAX_IMAGE_SIZE / 1024 / 1024} МБ`);
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve({
        id: uid(),
        name: file.name,
        url: e.target.result,
        size: file.size,
        mimeType: file.type,
        uploadedAt: Date.now(),
      });
      reader.onerror = () => reject(new Error('Ошибка чтения файла'));
      reader.readAsDataURL(file);
    });
  }

  async addAttachment(commentId, file) {
    const attachment = await this.createAttachment(file);
    const comment = this._commentRepo.findById(commentId);
    if (!comment) throw new Error('Комментарий не найден');
    comment.attachments = comment.attachments || [];
    comment.attachments.push(attachment);
    comment.updatedAt = Date.now();
    this._commentRepo.save(comment);
    this._notify();
    return attachment;
  }
}