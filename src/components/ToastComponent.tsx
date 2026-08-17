// Компонент Toast - вынесен в отдельный файл для Fast Refresh
import { useEffect, useRef } from 'react';

export const ToastComponent = ({ message, type = 'info', onClose, duration = 3000 }) => {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setTimeout(() => onCloseRef.current(), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  const colors = {
    info: '#2196F3',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336'
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '16px 24px',
      borderRadius: '8px',
      backgroundColor: colors[type] || colors.info,
      color: 'white',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 10000,
      minWidth: '280px',
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{message}</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            marginLeft: '12px',
            padding: '0 4px'
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};
