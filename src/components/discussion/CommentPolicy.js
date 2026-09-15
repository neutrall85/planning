import { has } from '../../utils/permissions';
import { COMMENT_EDIT_WINDOW } from '../../utils/constants';

/**
 * Доменный сервис: правила отображения/действий над комментарием.
 * UI-компоненты не знают о правах напрямую — только спрашивают policy.
 *
 * Порядок сортировки в дереве — не правило доступа, поэтому живёт в
 * utils/commentTree.js. Здесь только «кто и что может делать».
 */
export class CommentPolicy {
  constructor({ currentUser, comments = [], readOnly = false }) {
    this.currentUser = currentUser;
    this.comments = comments;
    this.readOnly = readOnly;
  }

  canEdit(c) {
    return (
      c.authorId === this.currentUser.id &&
      Date.now() - c.createdAt < COMMENT_EDIT_WINDOW
    );
  }

  canDelete(c) {
    if (this.comments.some(x => x.parentId === c.id)) return false;
    return (
      c.authorId === this.currentUser.id &&
      Date.now() - c.createdAt < COMMENT_EDIT_WINDOW
    );
  }

  canPin() {
    return has(this.currentUser, 'admin', 'director', 'project_lead', 'project_manager');
  }

  /** Возвращает emoji, которым пользователь отреагировал (или null). */
  static getUserReaction(comment, userId) {
    const reactions = comment.reactions || {};
    for (const [emoji, users] of Object.entries(reactions)) {
      if (users.includes(userId)) return emoji;
    }
    return null;
  }
}