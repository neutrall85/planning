import { useEffect, useState } from 'react';
import { Ic, ICONS } from './Icons';

export const Modal = ({ title, onClose, children, width = 640 }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={`overlay${mounted ? ' overlay-visible' : ''}`} onMouseDown={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: width }}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}><Ic d={ICONS.x} size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};