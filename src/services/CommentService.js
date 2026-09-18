import { uid } from '../utils/date';
import { FILE_LIMITS, FILE_MESSAGES } from '../utils/constants';

const ALLOWED_REACTIONS = new Set(["👍", "❤️", "🔥", "😂", "😮", "😢", "✅"]);
const PREVIEW_LENGTH = 60;

export class CommentService {
  constructor({ commentRepo, notificationService, auditService, notify }) {
    this._commentRepo = commentRepo;
    this._notifications = notificationService;
    this._audit = auditService;
    this._notify = notify;
  }

  getComments(filter = {}) {
    const list = filter.search
      ? this._commentRepo.search(filter, filter.search)
      : this._commentRepo.findByFilter(filter);
    return this._sort(list);
  }

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

  /**
   * Короткая выжимка текста комментария для журнала.
   * 60 символов - достаточно, чтобы опознать о чём речь, и не
   * раздувает поле details на весь текст.
   */
  _preview(text) {
    if (!text) return "";
    return text.length > PREVIEW_LENGTH ? text.slice(0, PREVIEW_LENGTH) + "…" : text;
  }

  addComment(data) {
    const comment = {
      id: uid(),
      projectId: data.projectId,
      taskId: data.taskId || null,
      parentId: data.parentId || null,
      authorId: data.authorId,
      text: data.text || "",
      attachments: data.attachments || [],
      reactions: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
      pinned: false,
    };
    this._commentRepo.save(comment);
    this._notifications.notifyComment(comment);
    const isReply = !!comment.parentId;
    const target = comment.taskId ? "task" : "project";
    const targetId = comment.taskId || comment.projectId;
    const action = isReply ? "Ответ на комментарий" : "Добавлен комментарий";
    this._audit.addAudit(action, this._preview(comment.text) || "(без текста)", target, targetId, comment.authorId);
    this._notify();
    return comment;
  }

  updateComment(id, newText) {
    const comment = this._commentRepo.findById(id);
    if (!comment) throw new Error("Комментарий не найден");
    const updated = {
      ...comment,
      text: newText,
      updatedAt: Date.now(),
    };
    this._commentRepo.save(updated);
    this._audit.addAudit(
      "Изменён комментарий",
      this._preview(newText) || "(без текста)",
      updated.taskId ? "task" : "project",
      updated.taskId || updated.projectId,
      updated.authorId
    );
    this._notify();
    return updated;
  }

  deleteComment(id) {
    const comment = this._commentRepo.findById(id);
    if (comment) {
      this._audit.addAudit(
        "Удалён комментарий",
        this._preview(comment.text) || "(без текста)",
        comment.taskId ? "task" : "project",
        comment.taskId || comment.projectId,
        comment.authorId
      );
    }
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
    if (!comment) throw new Error("Комментарий не найден");
    const updated = { ...comment, pinned: !comment.pinned };
    this._commentRepo.save(updated);
    this._notify();
    this._audit.addAudit(
      updated.pinned ? "Закрепление комментария" : "Открепление комментария",
      this._preview(updated.text),
      updated.taskId ? "task" : "project",
      updated.taskId || updated.projectId,
      actorId || "system"
    );
    return updated;
  }

  setReaction(commentId, userId, emoji) {
    if (!ALLOWED_REACTIONS.has(emoji)) throw new Error("Недопустимая реакция");
    const comment = this._commentRepo.findById(commentId);
    if (!comment) throw new Error("Комментарий не найден");

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
    if (emoji !== prevEmoji) reactions[emoji] = [...(reactions[emoji] || []), userId];

    const updated = { ...comment, reactions };
    this._commentRepo.save(updated);
    this._notify();
    return { commentId, emoji: emoji !== prevEmoji ? emoji : null };
  }

  toggleReaction(commentId, userId, emoji) {
    return this.setReaction(commentId, userId, emoji);
  }

  createAttachment(file) {
    if (!file.type.startsWith("image/")) throw new Error(FILE_MESSAGES.notImage);
    if (file.size > FILE_LIMITS.image) throw new Error(FILE_MESSAGES.imageTooLarge);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve({
        id: uid(),
        name: file.name,
        url: e.target.result,
        size: file.size,
        mimeType: file.type,
        uploadedAt: Date.now(),
      });
      reader.onerror = () => reject(new Error("Ошибка чтения файла"));
      reader.readAsDataURL(file);
    });
  }

  async addAttachment(commentId, file) {
    const attachment = await this.createAttachment(file);
    const comment = this._commentRepo.findById(commentId);
    if (!comment) throw new Error("Комментарий не найден");
    const updated = {
      ...comment,
      attachments: [...(comment.attachments || []), attachment],
      updatedAt: Date.now(),
    };
    this._commentRepo.save(updated);
    this._notify();
    return attachment;
  }
}