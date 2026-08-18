import { useEffect, useState, useRef } from 'react';
import { Ic } from './Icons';
import { useModalAccessibility } from '../hooks';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export const Modal = ({ title, onClose, children, width = 640 }: ModalProps) => {
  const [mounted, setMounted] = useState(false);
  const titleId = 'modal-title-' + Math.random().toString(36).substr(2, 9);
  
  const { modalRef, handleKeyDown, getDialogProps } = useModalAccessibility({
    isOpen: true,
    onClose,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div 
      className={`overlay${mounted ? ' overlay-visible' : ''}`} 
      onMouseDown={handleOverlayClick}
      role="presentation"
    >
      <div 
        ref={modalRef}
        className="modal" 
        style={{ maxWidth: width }}
        onKeyDown={handleKeyDown}
        {...getDialogProps()}
        aria-labelledby={titleId}
      >
        <div className="modal-head">
          <h3 id={titleId}>{title}</h3>
          <button 
            className="icon-btn" 
            onClick={onClose}
            aria-label="Закрыть"
          >
            <Ic name="x" size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};