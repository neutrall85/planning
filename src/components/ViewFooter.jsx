// src/components/ViewFooter.jsx
import { useLayoutEffect, useRef } from 'react';

/**
 * Подвал раздела - панель внизу контента, прижатая к нижнему краю
 * видимой области.
 *
 * По образцу ModalShell.footer: единая разметка, в которую раздел
 * кладёт только своё содержимое. Отличие от .modal-foot в
 * позиционировании: у модалки футер - часть рамки окна, у раздела
 * содержимое длиннее экрана, и футер должен оставаться на виду при
 * прокрутке. Поэтому position: sticky.
 *
 * API из двух слотов:
 *   - children - левая часть (переключатели, счётчики); React кладёт
 *     их рядом как соседей, обёртка не нужна;
 *   - action   - правая часть (обычно одна кнопка создания), прижата
 *     к правому краю через margin-left: auto.
 *
 * children вместо произвольного набора пропсов - идиома React: для
 * левой части не нужен ни фрагмент, ни искусственная обёртка. action
 * отдельным пропсом, потому что это семантически другая роль
 * (действие vs. управление видом), и раскладка у неё своя.
 *
 * Если оба слота пусты - компонент возвращает null: пустая полоса
 * с рамкой внизу экрана не нужна.
 *
 * Регистрация класса .has-view-foot на .content.
 *
 * Раньше в styles.css было правило .content:has(> .view-foot),
 * которое снимало боковые padding'и у .content, когда внутри рендерился
 * футер - полоса шла от края до края, без двойного отступа. Проблема
 * :has() в том, что браузер перепроверяет совпадение при каждом
 * изменении дочерних узлов .content. А в .content лежит всё дерево
 * активной вьюхи (канбан, гантт, таблицы) - при скролле, перерисовке
 * карточек, обновлении задач это заметная просадка.
 *
 * Теперь класс вешается императивно из самого ViewFooter: он знает,
 * что он - футер, и знает, что его действие касается контейнера.
 * Родитель (.content) об этом ничего не знает и знать не должен.
 * closest('.content') находит контейнер по классу, не завязываясь на
 * конкретную структуру DOM выше.
 *
 * useLayoutEffect - до пейнта, чтобы не было кадра без снятого
 * padding'а. Cleanup снимает класс при размонтировании, чтобы при
 * переходе на вьюху без футера .content не остался с флагом.
 *
 * depends от hasContent, а не от children/action: эффект должен
 * срабатывать только на появление/исчезновение контента, а не на
 * каждое изменение JSX внутри слотов.
 */
export function ViewFooter({ children = null, action = null, className = '' }) {
  const rootRef = useRef(null);
  const hasContent = !!(children || action);

  useLayoutEffect(() => {
    if (!hasContent) return undefined;
    const el = rootRef.current;
    if (!el) return undefined;
    const content = el.closest('.content');
    if (!content) return undefined;
    content.classList.add('has-view-foot');
    return () => content.classList.remove('has-view-foot');
  }, [hasContent]);

  if (!hasContent) return null;

  return (
    <div
      ref={rootRef}
      className={`view-foot${className ? ' ' + className : ''}`}
    >
      {children}
      {action && <div className="view-foot-action">{action}</div>}
    </div>
  );
}