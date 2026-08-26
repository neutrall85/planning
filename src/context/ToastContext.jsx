import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
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

const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;
  return createPortal(
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: '400px',
      width: '100%',
    }}>
      {toasts.map(toast => {
        let bgColor = '#3b82f6';
        let textColor = '#ffffff';
        if (toast.type === 'success') bgColor = '#10b981';
        else if (toast.type === 'error') bgColor = '#ef4444';
        else if (toast.type === 'warning') bgColor = '#f59e0b';
        else if (toast.type === 'info') bgColor = '#3b82f6';
        return (
          <div
            key={toast.id}
            style={{
              background: bgColor,
              color: textColor,
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
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '18px',
                lineHeight: '1',
                padding: '0 4px',
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>,
    document.body
  );
};