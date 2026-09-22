// src/components/UnreadBadge.jsx
import { messageWord } from '../utils/pluralize';

/**
 * Метка непрочитанных сообщений на карточке. Позиционируется абсолютно
 * в правом нижнем углу — родитель должен быть position: relative
 * (у .kcard и у .pj-card relative уже есть).
 *
 * Если передан onClick — бейдж становится кнопкой: клик открывает чат
 * сущности напрямую, минуя родительскую карточку. Это ключевая деталь:
 * без stopPropagation родительский onOpen перехватил бы клик и открыл
 * карточку на вкладке по умолчанию («Данные» / «Информация»), а
 * пользователь хотел именно чат.
 *
 * role="button" + tabIndex + onKeyDown — вместо вложенного <button>:
 * бейдж часто лежит внутри кликабельной карточки, которая сама может
 * быть <button> или div с onClick. Вложенные <button> — невалидный
 * HTML. Span с role даёт ту же доступность без нарушения семантики.
 *
 * Экспортируется и как named, и как default — потому что в разных
 * местах проекта встречаются оба стиля импорта (`import UnreadBadge`
 * и `import { UnreadBadge }`). Наличие двух форм здесь дешевле, чем
 * правка импортов во всех потребителях и риск забыть один.
 */
export function UnreadBadge({ count, onClick = null }) {
  if (!count) return null;

  const clickable = typeof onClick === 'function';

  const handleClick = clickable
    ? (e) => {
        e.stopPropagation();
        onClick();
      }
    : undefined;

  const handleKeyDown = clickable
    ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }
    : undefined;

  return (
    <span
      className={`kcard-unread${clickable ? ' kcard-unread--clickable' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      title={clickable ? 'Открыть чат' : undefined}
    >
      {count} {messageWord(count)}
    </span>
  );
}

export default UnreadBadge;