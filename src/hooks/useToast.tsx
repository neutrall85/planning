// useToast.jsx - логика управления Toast
// Экспортирует хук useToast и компонент ToastContainer

import { useState } from 'react';
import { ToastComponent } from '../components/ToastComponent';

/**
 * Хук для управления toast-уведомлениями
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
    info: (msg, duration) => addToast(msg, 'info', duration || 3000),
    success: (msg, duration) => addToast(msg, 'success', duration || 3000),
    warning: (msg, duration) => addToast(msg, 'warning', duration || 3000),
    error: (msg, duration) => addToast(msg, 'error', duration || 3000)
  };
  
  return { toast, removeToast, toasts };
};

/**
 * Компонент-контейнер для отображения toast-уведомлений
 */
export function ToastContainer() {
  const { toasts, removeToast } = useToast();
  
  return (
    <>
      {toasts.map(t => (
        <ToastComponent
          key={t.id}
          message={t.message}
          type={t.type}
          duration={t.duration}
          onClose={() => removeToast(t.id)}
        />
      ))}
    </>
  );
}
