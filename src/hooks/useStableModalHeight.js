import { useLayoutEffect, useRef } from 'react';

/**
 * Стабилизирует высоту тела модального окна по эталонной вкладке.
 *
 * Модалки задачи и проекта содержат несколько вкладок, у каждой своя высота,
 * из-за чего окно «прыгает» при переключении. Хук запоминает высоту эталонной
 * вкладки (обычно первой) и держит её как минимальную высоту для остальных.
 *
 * Измерение и применение разделены:
 *   - JS знает только число (offsetHeight эталонной вкладки);
 *   - CSS решает, как его использовать (правило `min-height` в styles.css).
 * Разметка остаётся чистой: `style={{}}` в JSX нет, значение передаётся в
 * CSS-переменную `--modal-body-min-h` через `style.setProperty` — это
 * императивный DOM-API, а не inline-стиль в дереве React.
 *
 * @param {string} referenceTabId — id вкладки-эталона
 * @param {string} activeTabId — id текущей вкладки
 * @returns {React.RefObject<HTMLElement>} ref для `.modal-body`
 */
export function useStableModalHeight(referenceTabId, activeTabId) {
  const bodyRef = useRef(null);
  const measuredRef = useRef(false);

  useLayoutEffect(() => {
    if (measuredRef.current) return;
    if (activeTabId !== referenceTabId) return;

    const el = bodyRef.current;
    if (!el) return;

    const height = el.offsetHeight;
    if (!height) return;

    el.style.setProperty('--modal-body-min-h', `${height}px`);
    measuredRef.current = true;
  }, [activeTabId, referenceTabId]);

  return bodyRef;
}