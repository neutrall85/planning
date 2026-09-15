// src/hooks/useReactionPicker.js
import { useCallback, useEffect, useRef, useState } from 'react';

const AUTO_DISMISS_MS = 3000;

/**
 * Состояние попапа реакций: открыт/закрыт, автозакрытие через `timeout`
 * мс, закрытие по клику вне `rootRef`.
 *
 * Автозакрытие работает по признаку «курсор вне попапа»:
 *   - пока указатель внутри `pickerRef` — таймер стоит;
 *   - как только вышел — таймер идёт;
 *   - если зашёл обратно до срабатывания — таймер снова стоп.
 *
 * Это надёжнее, чем перезапуск таймера на mousemove: неподвижная мышь
 * над попапом не считается «бездействием» — попап не закроется под
 * курсором.
 *
 * Всё DOM-знание (refs, listeners, setTimeout) инкапсулировано здесь.
 *
 * @param {React.RefObject<HTMLElement>} rootRef — область «вне» (карточка
 *        комментария); клик вне неё закрывает попап
 * @param {number} [timeout] — мс до авто-закрытия, пока курсор вне попапа
 */
export function useReactionPicker(rootRef, timeout = AUTO_DISMISS_MS) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef(null);
  const timerRef = useRef(null);
  const pointerInsideRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setOpen(false);
    }, timeout);
  }, [clearTimer, timeout]);

  const close = useCallback(() => {
    clearTimer();
    pointerInsideRef.current = false;
    setOpen(false);
  }, [clearTimer]);

  const toggle = useCallback(() => setOpen(prev => !prev), []);

  // Слушатели живут ровно пока попап открыт. Cleanup снимает всё при
  // закрытии и размонтировании — «выстрелить» в мёртвый компонент
  // таймер не может.
  useEffect(() => {
    if (!open) return;

    pointerInsideRef.current = false;
    startTimer();

    const onOutside = (event) => {
      const root = rootRef.current;
      if (root && !root.contains(event.target)) close();
    };

    // Единая точка правды о положении курсора: mousemove на документе.
    // Сравниваем текущее состояние с предыдущим — таймер трогаем только
    // при смене (вошёл/вышел), иначе сбрасывали бы его на каждый пиксель.
    const onMove = (event) => {
      const picker = pickerRef.current;
      const inside = !!picker && picker.contains(event.target);
      if (inside === pointerInsideRef.current) return;
      pointerInsideRef.current = inside;
      if (inside) clearTimer();
      else startTimer();
    };

    document.addEventListener('mousedown', onOutside);
    document.addEventListener('mousemove', onMove);

    return () => {
      document.removeEventListener('mousedown', onOutside);
      document.removeEventListener('mousemove', onMove);
      clearTimer();
    };
  }, [open, close, startTimer, clearTimer, rootRef]);

  return { open, toggle, close, pickerRef };
}