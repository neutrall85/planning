import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Управляет показом пароля с автоскрытием.
 *
 * Инкапсулирует тривиальную логику, которая иначе копируется в каждом
 * экране с паролем: показать по клику и через N мс снова скрыть.
 * Клик по видимому значению снимает таймер и скрывает сразу — так
 * пользователь может закрыть пароль, не дожидаясь таймаута.
 */
export function usePasswordReveal(timeout = 10000) {
  const [shown, setShown] = useState(false);
  const timerRef = useRef(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    if (shown) {
      setShown(false);
      clear();
      return;
    }
    setShown(true);
    clear();
    timerRef.current = setTimeout(() => {
      setShown(false);
      timerRef.current = null;
    }, timeout);
  }, [shown, timeout, clear]);

  // Очистка при размонтировании — чтобы не сеттить state у мёртвого хука.
  useEffect(() => () => clear(), [clear]);

  return { shown, toggle };
}