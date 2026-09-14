import React, { useEffect } from 'react';
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
}) => {
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
      <div className={`modal ${className}`} style={{ maxWidth: width }}>
        <div className="modal-head">
          {headerBefore && <div className="modal-header-before">{headerBefore}</div>}
          <h3>{title}</h3>
          {headerAfter && <div className="modal-header-after">{headerAfter}</div>}
          <button className="icon-btn" onClick={onClose}>
            <Ic d={ICONS.x} size={16} />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footer}
      </div>
    </div>
  );
};