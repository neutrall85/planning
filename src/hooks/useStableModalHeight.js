// src/hooks/useStableModalHeight.js
import { useLayoutEffect, useRef } from 'react';

/**
 * Стабилизирует высоту тела модального окна.
 *
 * Модалки задачи и проекта содержат несколько вкладок, у каждой своя
 * высота, из-за чего окно «прыгает» при переключении. Хук запоминает
 * максимальную высоту, которую видел среди всех открытых вкладок, и
 * держит её как min-height для остальных.
 *
 * Правило «запоминаем максимум» - вместо привязки к эталонной вкладке:
 *   - модалку можно открыть сразу на любой вкладке (например,
 *     #/project/x/tasks) - высота всё равно зафиксируется с первого
 *     замера и не будет прыгать, когда пользователь перейдёт на другие;
 *   - если наткнёмся на вкладку выше предыдущей - поднимем min-height;
 *   - если наткнёмся на вкладку ниже - не сжимаем.
 *
 * Измерение и применение разделены:
 *   - JS знает только число (offsetHeight);
 *   - CSS решает, как его использовать (правило min-height в styles.css).
 * Разметка остаётся чистой: значение передаётся в CSS-переменную
 * --modal-body-min-h через style.setProperty - это императивный DOM-API,
 * а не inline-стиль в дереве React.
 *
 * @param {string} activeTabId - id текущей вкладки; меняется → перезамер
 * @returns {React.RefObject<HTMLElement>} ref для .modal-body
 */
export function useStableModalHeight(activeTabId) {
  const bodyRef = useRef(null);
  const maxHeightRef = useRef(0);

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;

    const height = el.offsetHeight;
    if (height <= maxHeightRef.current) return;

    maxHeightRef.current = height;
    el.style.setProperty('--modal-body-min-h', `${height}px`);
  }, [activeTabId]);

  return bodyRef;
}