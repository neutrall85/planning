// src/context/ToastContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const BG_BY_TYPE = {
  success: '#10b981',
  error:   '#ef4444',
  warning: '#f59e0b',
  info:    '#3b82f6',
};

/**
 * Один тост. Живёт ровно `toast.duration` миллисекунд, после чего
 * сообщает родителю о своём удалении. Таймер - часть жизненного цикла
 * самого тоста, поэтому владение им и очистка в cleanup useEffect
 * логично живут здесь, а не в провайдере: провайдер отвечает за
 * очередь, тост - за своё время.
 */
const ToastItem = ({ toast, onRemove }) => {
  useEffect(() => {
    const id = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      style={{
        background: BG_BY_TYPE[toast.type] || BG_BY_TYPE.info,
        color: '#ffffff',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        animation: 'fadeUp 0.2s ease',
      }}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: '1',
          padding: '0 4px',
        }}
        aria-label="Закрыть"
      >
        ×
      </button>
    </div>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;
  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '400px',
        width: '100%',
      }}
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body,
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 7000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};