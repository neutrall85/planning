import { useEffect } from 'react';

/**
 * Стек активных перехватчиков Escape.
 *
 * Раньше обработчик просто глушил клавишу через stopImmediatePropagation.
 * Этого достаточно для одного уровня (модалка + ConfirmDialog, где
 * ConfirmDialog ловит событие в фазе погружения, а модалка — во всплытии),
 * но при двух и более «перехватчиках» зарегистрированные раньше гасили
 * событие раньше остальных: Escape закрывал внешнюю модалку вместо
 * внутренней.
 *
 * Теперь каждый экземпляр кладёт в стек уникальный токен и реагирует на
 * клавишу только если он — верхний. Порядок стека = порядок монтирования,
 * то есть «сверху вниз» по визуальному слою. Escape закрывает ровно один
 * слой — верхний.
 */
const escapeStack = [];

export function useNestedModalEscape(onEscape) {
  useEffect(() => {
    const token = {};
    escapeStack.push(token);

    const handler = (event) => {
      if (event.key !== 'Escape') return;
      if (escapeStack[escapeStack.length - 1] !== token) return;
      event.stopImmediatePropagation();
      onEscape();
    };

    window.addEventListener('keydown', handler, true);

    return () => {
      window.removeEventListener('keydown', handler, true);
      const idx = escapeStack.indexOf(token);
      if (idx !== -1) escapeStack.splice(idx, 1);
    };
  }, [onEscape]);
}