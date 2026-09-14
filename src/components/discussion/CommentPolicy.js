import { has } from '../../utils/permissions';
import { COMMENT_EDIT_WINDOW } from '../../utils/constants';

/**
 * Доменный сервис: правила отображения/действий над комментарием.
 * UI-компоненты не знают о правах напрямую — только спрашивают policy.
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
    if (has(this.currentUser, 'admin', 'director')) return true;
    const hasReplies = this.comments.some(x => x.parentId === c.id);
    return c.authorId === this.currentUser.id && !hasReplies;
  }

  canPin() {
    return has(this.currentUser, 'admin', 'director', 'project_lead', 'project_manager');
  }

  static countReactions(comment) {
    return Object.values(comment.reactions || {}).reduce(
      (sum, arr) => sum + (arr?.length || 0),
      0
    );
  }

  /** Возвращает emoji, которым пользователь отреагировал (или null). */
  static getUserReaction(comment, userId) {
    const reactions = comment.reactions || {};
    for (const [emoji, users] of Object.entries(reactions)) {
      if (users.includes(userId)) return emoji;
    }
    return null;
  }

  static sort(list, order) {
    const sorted = [...list];
    if (order === 'new') sorted.sort((a, b) => b.createdAt - a.createdAt);
    else if (order === 'old') sorted.sort((a, b) => a.createdAt - b.createdAt);
    else if (order === 'popular') {
      sorted.sort((a, b) => {
        const diff = CommentPolicy.countReactions(b) - CommentPolicy.countReactions(a);
        return diff !== 0 ? diff : b.createdAt - a.createdAt;
      });
    }
    return sorted;
  }
}