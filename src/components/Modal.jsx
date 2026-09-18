import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Ic, ICONS } from './Icons';

export const Modal = ({
  title,
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

  // Ширина передаётся через CSS-переменную, а не inline-стилем: значение
  // по умолчанию живёт в styles.css рядом с остальным описанием .modal.
  // Это устраняет style={{ maxWidth }} в JSX - разметка остаётся чистой.
  useLayoutEffect(() => {
    rootRef.current?.style.setProperty('--modal-max-w', `${width}px`);
  }, [width]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
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
          <h3>{title}</h3>
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