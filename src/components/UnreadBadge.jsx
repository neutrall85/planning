import { messageWord } from "../utils/pluralize.js";

/**
 * Метка непрочитанных сообщений на карточке. Позиционируется абсолютно
 * в правом нижнем углу — родитель должен быть position: relative
 * (у .kcard и у .pj-card relative уже есть).
 */
export function UnreadBadge({ count }) {
  if (!count) return null;
  return (
    <span className="kcard-unread">
      {count} {messageWord(count)}
    </span>
  );
}