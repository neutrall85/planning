import { useCallback, useEffect, useRef, useState } from 'react';
import { isSameEntity, parseRoute } from '../utils/routes';

/**
 * Двусторонняя привязка window.location.hash ↔ React-состояние.
 *
 * Хук знает только механику: читает начальный фрагмент, реагирует на
 * браузерные переходы (назад/вперёд, ручная правка адреса) и пишет
 * фрагмент по запросу.
 *
 * Наружу отдаётся navigate(hash) - строкой, а не объектом: сравнение
 * строк по значению не даёт «ложного перезапуска», когда
 * объект-дескриптор каждый рендер новый, а значение то же самое.
 *
 * Запись идёт через pushState / replaceState, а не через
 * location.hash = - тогда браузер не шлёт 'hashchange' на наши
 * собственные записи, и два направления не «пинг-понгуют».
 * Единственный источник 'hashchange' - настоящий переход браузера.
 */
export function useHashRoute() {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const lastRouteRef = useRef(route);

  useEffect(() => {
    const onChange = () => {
      const next = parseRoute(window.location.hash);
      lastRouteRef.current = next;
      setRoute(next);
    };
    // popstate ловит «назад/вперёд», hashchange - ручную правку URL.
    window.addEventListener('popstate', onChange);
    window.addEventListener('hashchange', onChange);
    return () => {
      window.removeEventListener('popstate', onChange);
      window.removeEventListener('hashchange', onChange);
    };
  }, []);

  /**
   * Перейти по хэшу. Принимает готовую строку (например,
   * '#/view/tasks' или '#/task/t1/form'), полученную из buildRoute на
   * стороне вызывающего.
   *
   * Идемпотентно: если текущий хэш уже равен переданному, ничего не
   * делаем и не трогаем состояние.
   *
   * Отдельный случай - та же сущность и та же вкладка, но другая
   * строка URL (например, хвостовой слэш '#/task/t1/form/'). Раньше
   * здесь вызывался setRoute(parsed) с новым объектом, и эффект
   * [route] в MainLayout перезапускался вхолостую. В связке с
   * closeTaskWithReturn при удалении подзадачи (там openTask(P, ...)
   * вызвается, пока URL ещё указывает на удалённую задачу S) это
   * давало лишний проход эффекта: он видел route = {TASK, S} и вызывал
   * denyAccess по «несуществующей задаче». Теперь в этом случае
   * обновляем только адресную строку через replaceState, состояние
   * не трогаем.
   */
  const navigate = useCallback((hash) => {
    if (!hash || typeof hash !== 'string') return;
    if (window.location.hash === hash) return;

    const parsed = parseRoute(hash);
    if (!parsed) return;

    const prev = lastRouteRef.current;
    const sameLogical = isSameEntity(prev, parsed)
      && (prev?.tab || null) === (parsed.tab || null);

    if (sameLogical) {
      lastRouteRef.current = parsed;
      window.history.replaceState(null, '', hash);
      return;
    }

    const method = isSameEntity(prev, parsed) ? 'replaceState' : 'pushState';
    lastRouteRef.current = parsed;
    window.history[method](null, '', hash);
    setRoute(parsed);
  }, []);

  return { route, navigate };
}