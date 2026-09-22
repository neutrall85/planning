// src/context/ToastContext.jsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

/**
 * Один тост.
 *
 * Таймер живёт здесь, а не в провайдере: у каждого тоста своя
 * длительность, провайдер отвечает за очередь, а не за время жизни
 * отдельного элемента. Cleanup в useEffect снимает таймер, если тост
 * удалили вручную (клик по ×) до истечения duration.
 *
 * Вся визуальная часть - в CSS. Тип тоста выбирает модификатор
 * .toast--<type>; если по какой-то причине пришёл неизвестный type,
 * модификатора не будет и сработает фолбэк через .toast--info,
 * который задаётся в JS при формировании className.
 */
const ToastItem = ({ toast, onRemove }) => {
  useEffect(() => {
    const id = setTimeout(() => onRemove(toast.id), toast.duration);
    return () => clearTimeout(id);
  }, [toast.id, toast.duration, onRemove]);

  const typeClass = ['success', 'error', 'warning', 'info'].includes(toast.type)
    ? toast.type
    : 'info';

  return (
    <div className={`toast toast--${typeClass}`} role="status">
      <span className="toast-message">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Закрыть"
      >
        ×
      </button>
    </div>
  );
};

/**
 * Контейнер стека тостов. Порядок в массиве `toasts` хронологический
 * (append в конец) - реверс делает CSS через column-reverse. В JS
 * порядок остаётся линейным: toasts[0] - самый старый, toasts[length-1] -
 * самый свежий; логика не путается с визуальным порядком.
 */
const ToastContainer = ({ toasts, removeToast }) => {
  if (!toasts.length) return null;

  return createPortal(
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>,
    document.body
  );
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 7000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};