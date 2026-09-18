import { useCallback, useEffect, useRef, useState } from 'react';
import { buildRoute, isSameEntity, parseRoute } from '../utils/routes';

/**
 * Двусторонняя привязка window.location.hash ↔ React-состояние.
 *
 * Хук знает только механику: читает начальный фрагмент, реагирует на
 * браузерные переходы (назад/вперёд, ручная правка адреса) и пишет
 * фрагмент по запросу.
 *
 * Наружу отдаётся navigate(hash) - строкой, а не объектом. Это принципиально:
 * потребитель (MainLayout) держит в deps эффекта именно строку, а
 * сравнение строк по значению не даёт «ложного перезапуска», когда
 * объект-дескриптор каждый рендер новый, а значение то же самое.
 *
 * Запись идёт через pushState / replaceState, а не через location.hash = - тогда
 * браузер не шлёт 'hashchange' на наши собственные записи и два
 * направления не «пинг-понгуют». Единственный источник 'hashchange' -
 * настоящий переход браузера.
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
   * Перейти по хэшу. Принимает готовую строку (например, '#/view/tasks'
   * или '#/task/t1/form'), полученную из buildRoute на стороне вызывающего.
   *
   * Идемпотентно: если текущий хэш уже равен переданному, ничего не делаем
   * и не трогаем состояние - петля «state → URL → state» невозможна.
   *
   * pushState / replaceState выбирается по смыслу перехода:
   *   - тот же объект (task t1), другая вкладка → replaceState;
   *   - другой объект или view → pushState.
   */
  const navigate = useCallback((hash) => {
    if (!hash || typeof hash !== 'string') return;
    if (window.location.hash === hash) return;

    const parsed = parseRoute(hash);
    if (!parsed) return;

    const method = isSameEntity(lastRouteRef.current, parsed)
      ? 'replaceState'
      : 'pushState';

    lastRouteRef.current = parsed;
    window.history[method](null, '', hash);
    setRoute(parsed);
  }, []);

  return { route, navigate };
}