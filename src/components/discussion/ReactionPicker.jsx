// src/components/discussion/ReactionPicker.jsx
import { useCallback } from 'react';
import { REACTIONS } from '../../utils/reactions';

/**
 * Панель выбора реакции. Рендерит ряд эмодзи-кнопок поверх комментария.
 *
 * Контракт:
 *   - containerRef - ref на корневой div попапа; хук useReactionPicker
 *                    использует его для отслеживания «курсор внутри»;
 *   - activeEmoji  - текущая реакция пользователя (Unicode);
 *   - onPick(emoji) - выбор реакции.
 *
 * Вся логика «сколько попап живёт» - в useReactionPicker у вызывающего.
 * Здесь только разметка и клики.
 */
export default function ReactionPicker({ containerRef, activeEmoji, onPick }) {
  // Клик по контейнеру попапа не должен всплывать к карточке комментария,
  // иначе её onClick закроет попап как «клик по телу комментария».
  const handleContainerClick = useCallback((e) => e.stopPropagation(), []);

  return (
    <div
      ref={containerRef}
      className="reaction-picker"
      onClick={handleContainerClick}
      role="toolbar"
      aria-label="Выбор реакции"
    >
      {REACTIONS.map(({ emoji, label }) => {
        const isActive = activeEmoji === emoji;
        return (
          <button
            key={emoji}
            type="button"
            className={`reaction-pick-btn${isActive ? ' on' : ''}`}
            onClick={() => onPick(emoji)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}