// src/components/FloatingMenu.jsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ic } from './Icons';
import { useNestedModalEscape } from './Templates/useNestedModalEscape';

const EDGE = 8;    // минимальный отступ от края вьюпорта
const OFFSET = 4;  // зазор между триггером и меню

/**
 * Плавающее меню действий.
 *
 * API - render-prop. Потребитель получает два набора пропсов и раскладывает
 * их по своим узлам:
 *
 *   anchorProps - на контейнер, по которому правый клик открывает меню
 *                 (обычно это вся карточка). Содержит onContextMenu.
 *   buttonProps - на кнопку «⋯» в углу. Содержит ref (для позиционирования
 *                 под кнопкой), onClick с stopPropagation (чтобы клик по
 *                 кнопке не открывал карточку), onMouseDown с
 *                 stopPropagation (чтобы draggable-родитель в канбане не
 *                 начал перетаскивание), onContextMenu для правого клика
 *                 именно по кнопке, aria-haspopup / aria-expanded.
 *
 * Пункты меню - массив узлов одного из трёх видов:
 *   { id, label, icon?, hint?, danger?, disabled?, onClick? }
 *   { type: 'divider' }
 *   { type: 'header', label }
 *
 * Каждый экземпляр FloatingMenu - самодостаточный: держит своё состояние,
 * свой портал, свою позицию. Поэтому 50 карточек в канбане = 50 маленьких
 * изолированных состояний, а не одно общее на весь список.
 *
 * Закрытие: клик вне, Escape (через общий стек useNestedModalEscape),
 * scroll любой вложенности, resize.
 *
 * Стабильность колбэков: close / openFromAnchor / openAt / toggle
 * мемоизированы. Это не косметика - close попадает в useNestedModalEscape
 * и в useEffect-слушатели портала. Без мемоизации каждый ре-рендер
 * родителя (например, канбана при обновлении задач) пересоздавал бы
 * обработчики: токен Escape снимался/ставился бы в стек, слушатель
 * mousedown - снимался/ставился на document. В окне между cleanup и
 * setup событие может «проскочить». memo убирает это окно.
 */
export default function FloatingMenu({ items, placement = 'bottom-end', children }) {
  const anchorRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState(null);
  // Меню монтируется скрытым, useLayoutEffect измеряет его и ставит в
  // правильную точку - до первого пейнта. Мигания в (0,0) не видно.
  const [style, setStyle] = useState({ left: 0, top: 0, visibility: 'hidden' });

  const close = useCallback(() => {
    setOpen(false);
    setOrigin(null);
  }, []);

  const openFromAnchor = useCallback(() => {
    setOrigin({ type: 'anchor' });
    setOpen(true);
  }, []);

  const openAt = useCallback((x, y) => {
    setOrigin({ type: 'cursor', x, y });
    setOpen(true);
  }, []);

  const toggle = useCallback(() => {
    if (open) close();
    else openFromAnchor();
  }, [open, close, openFromAnchor]);

  useLayoutEffect(() => {
    if (!open || !origin) return;
    const menu = menuRef.current;
    if (!menu) return;

    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left;
    let top;

    if (origin.type === 'cursor') {
      left = origin.x;
      top = origin.y;
    } else {
      const r = anchorRef.current?.getBoundingClientRect();
      if (!r) {
        // Теоретически недостижимо: anchorRef проставляется через
        // buttonProps.ref, и если кнопка отрендерена - rect есть.
        // Но безопаснее показать меню в углу, чем оставить его невидимым.
        setStyle({ left: EDGE, top: EDGE, visibility: 'visible' });
        return;
      }
      left = placement.endsWith('end') ? r.right - mw : r.left;
      top = placement.startsWith('top') ? r.top - mh - OFFSET : r.bottom + OFFSET;
    }

    if (left + mw > vw - EDGE) left = vw - mw - EDGE;
    if (left < EDGE) left = EDGE;
    if (top + mh > vh - EDGE) top = vh - mh - EDGE;
    if (top < EDGE) top = EDGE;

    setStyle({ left, top, visibility: 'visible' });
  }, [open, origin, placement]);

  // anchorProps не зависит от open - стабилен. buttonProps зависит от open
  // через aria-expanded и toggle, поэтому пересобирается при смене open.
  const anchorProps = useMemo(() => ({
    onContextMenu: (e) => {
      e.preventDefault();
      openAt(e.clientX, e.clientY);
    },
  }), [openAt]);

  const buttonProps = useMemo(() => ({
    ref: anchorRef,
    onClick: (e) => {
      e.stopPropagation();
      toggle();
    },
    onMouseDown: (e) => e.stopPropagation(),
    onContextMenu: (e) => {
      e.preventDefault();
      e.stopPropagation();
      openAt(e.clientX, e.clientY);
    },
    'aria-haspopup': 'menu',
    'aria-expanded': open,
  }), [toggle, open, openAt]);

  return (
    <>
      {children({ anchorProps, buttonProps })}
      {open && (
        <FloatingMenuPortal
          menuRef={menuRef}
          style={style}
          items={items}
          onClose={close}
        />
      )}
    </>
  );
}

/**
 * Портал меню - отдельный компонент, чтобы useNestedModalEscape
 * регистрировался ровно на время, пока меню открыто. Хук кладёт токен
 * в общий стек Escape при монтировании; если бы он жил в FloatingMenu,
 * он занимал бы стек постоянно - и Escape при закрытом меню «съедался»
 * бы впустую.
 */
function FloatingMenuPortal({ menuRef, style, items, onClose }) {
  // Escape закрывает ровно верхний слой: если под меню лежит TaskModal,
  // закроется только меню. Порядок стека = порядок монтирования.
  useNestedModalEscape(onClose);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      onClose();
    };
    // Скролл и resize закрывают: позиция fixed, и без этого меню
    // «оторвётся» от триггера и будет висеть в пустоте.
    const onScrollOrResize = () => onClose();

    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [onClose, menuRef]);

  // Фокус в первое активное действие - клавиатурная навигация Tab
  // начинает работать сразу, а не после «пустого» Tab.
  useEffect(() => {
    const first = menuRef.current?.querySelector('.fm-item:not(:disabled)');
    first?.focus();
  }, [menuRef]);

  return createPortal(
    <div
      ref={menuRef}
      className="floating-menu"
      style={style}
      role="menu"
      // mousedown гасит outside-close до клика по пункту, click не даёт
      // событию всплыть по React-дереву к onClick карточки (порталы
      // сохраняют bubbling в дереве компонентов).
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => renderMenuItem(item, i, onClose))}
    </div>,
    document.body,
  );
}

function renderMenuItem(item, i, onClose) {
  if (item.type === 'divider') {
    return <div key={`d-${i}`} className="fm-divider" role="separator" />;
  }
  if (item.type === 'header') {
    return <div key={`h-${i}`} className="fm-header">{item.label}</div>;
  }
  return (
    <button
      key={item.id ?? i}
      type="button"
      role="menuitem"
      className={`fm-item${item.danger ? ' danger' : ''}`}
      disabled={item.disabled}
      onClick={() => {
        // Сначала закрываем: React 18 батчит setOpen и действие пункта,
        // поэтому модалка, открытая из onClick, уже не увидит меню поверх.
        onClose();
        item.onClick?.();
      }}
    >
      {item.icon && <span className="fm-icon"><Ic d={item.icon} size={14} /></span>}
      <span className="fm-label">{item.label}</span>
      {item.hint && <span className="fm-hint">{item.hint}</span>}
    </button>
  );
}