// src/services/CommentService.js
import { uid } from '../utils/date';
import { FILE_LIMITS, FILE_MESSAGES } from '../utils/constants';

const ALLOWED_REACTIONS = new Set(['👍', '❤️', '🔥', '😂', '😮', '😢', '✅']);

export class CommentService {
  constructor(commentRepo, notificationService, auditService, notifyCallback) {
    this._commentRepo = commentRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notifyCallback;
  }

  getComments(filter = {}) {
    const list = filter.search
      ? this._commentRepo.search(filter, filter.search)
      : this._commentRepo.findByFilter(filter);
    return this._sort(list);
  }

  /** Только фактические совпадения — источник для счётчика и навигации. */
  getMatches(filter = {}) {
    return this._commentRepo.findMatches(filter, filter.search);
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

  setReaction(commentId, userId, emoji) {
    if (!ALLOWED_REACTIONS.has(emoji)) {
      throw new Error('Недопустимая реакция');
    }

    const comment = this._commentRepo.findById(commentId);
    if (!comment) throw new Error('Комментарий не найден');

    const reactions = { ...(comment.reactions || {}) };

    let prevEmoji = null;
    for (const [e, users] of Object.entries(reactions)) {
      if (users.includes(userId)) { prevEmoji = e; break; }
    }

    for (const e of Object.keys(reactions)) {
      const next = reactions[e].filter(id => id !== userId);
      if (next.length === 0) delete reactions[e];
      else reactions[e] = next;
    }

    if (emoji !== prevEmoji) {
      reactions[emoji] = [...(reactions[emoji] || []), userId];
    }

    comment.reactions = reactions;
    this._commentRepo.save(comment);
    this._notify();

    return { commentId, emoji: emoji !== prevEmoji ? emoji : null };
  }

  toggleReaction(commentId, userId, emoji) {
    return this.setReaction(commentId, userId, emoji);
  }

  createAttachment(file) {
    if (!file.type.startsWith('image/')) {
      throw new Error(FILE_MESSAGES.notImage);
    }
    if (file.size > FILE_LIMITS.image) {
      throw new Error(FILE_MESSAGES.imageTooLarge);
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