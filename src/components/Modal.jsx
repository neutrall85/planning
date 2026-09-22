// src/components/Modal.jsx
import { useEffect, useLayoutEffect, useRef } from 'react';
import { Ic, ICONS } from './Icons';

/**
 * Базовое модальное окно.
 *
 * Внутри - оверлей, шапка (headerBefore + заголовок с опциональным
 * подзаголовком + headerAfter + крестик), тело и футер. Специализации
 * (ModalShell с кнопками «Отмена / Сохранить», TaskModal, ProjectModal)
 * строятся поверх.
 *
 * subtitle - необязательная вторая строка под h3: метаданные сущности
 * («Задачу составил…», «Создан 15.01.2026» и т.п.). Вынесен в h3-блок
 * отдельным элементом, а не склеен в один title строкой: заголовок -
 * крупный и тёмный, подзаголовок - мелкий и приглушённый, стили разные.
 *
 * Если subtitle не передан (null / undefined / пусто) - разметка не
 * меняется, h3 остаётся как есть.
 */
export const Modal = ({
  title,
  subtitle = null,
  onClose,
  children,
  footer = null,
  width = 640,
  className = '',
  headerBefore = null,
  headerAfter = null,
  bodyRef = null,
}) => {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    rootRef.current?.style.setProperty('--modal-max-w', `${width}px`);
  }, [width]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={rootRef} className={`modal ${className}`}>
        <div className="modal-head">
          {headerBefore && <div className="modal-header-before">{headerBefore}</div>}

          <div className="modal-title-block">
            <h3>{title}</h3>
            {subtitle && <div className="modal-subtitle">{subtitle}</div>}
          </div>

          {headerAfter && <div className="modal-header-after">{headerAfter}</div>}

          <button className="icon-btn" onClick={onClose}>
            <Ic d={ICONS.x} size={16} />
          </button>
        </div>

        <div className="modal-body" ref={bodyRef}>
          {children}
        </div>

        {footer}
      </div>
    </div>
  );
};