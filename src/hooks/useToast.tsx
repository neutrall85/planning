// useToast.tsx - логика управления Toast
// Экспортирует хук useToast и компонент ToastContainer

import { useState } from 'react';
import { ToastComponent } from '../components/ToastComponent';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastApi {
  info: (msg: string, duration?: number) => number;
  success: (msg: string, duration?: number) => number;
  warning: (msg: string, duration?: number) => number;
  error: (msg: string, duration?: number) => number;
}

interface UseToastReturn {
  toast: ToastApi;
  removeToast: (id: number) => void;
  toasts: Toast[];
}

/**
 * Хук для управления toast-уведомлениями
 */
export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const addToast = (message: string, type: ToastType = 'info', duration: number = 3000): number => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    return id;
  };
  
  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };
  
  const toast: ToastApi = {
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
