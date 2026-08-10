import { useState, useEffect } from 'react';

/**
 * Простой Toast-компонент для замены alert()
 */
export const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

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

/**
 * Hook для управления toast-уведомлениями
 */
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toast = {
    info: (msg, duration) => addToast(msg, 'info', duration),
    success: (msg, duration) => addToast(msg, 'success', duration),
    warning: (msg, duration) => addToast(msg, 'warning', duration),
    error: (msg, duration) => addToast(msg, 'error', duration)
  };

  const ToastContainer = () => (
    <>
      {toasts.map(t => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          duration={t.duration}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </>
  );

  return { toast, ToastContainer };
};

export default Toast;
