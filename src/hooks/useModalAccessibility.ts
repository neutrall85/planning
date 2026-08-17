/**
 * Хук для управления доступностью модальных окон
 * Реализует Focus Trap, закрытие по Esc, ARIA атрибуты
 */
import { useEffect, useRef, useCallback } from 'react';

interface UseModalAccessibilityOptions {
  isOpen: boolean;
  onClose?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

interface UseModalAccessibilityReturn {
  modalRef: React.RefObject<HTMLDivElement>;
  handleKeyDown: (event: React.KeyboardEvent) => void;
  getDialogProps: () => {
    role: string;
    'aria-modal': string;
    'aria-labelledby'?: string;
  };
}

export function useModalAccessibility({
  isOpen,
  onClose,
  initialFocusRef,
}: UseModalAccessibilityOptions): UseModalAccessibilityReturn {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Сохраняем элемент, который был в фокусе до открытия модалки
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      
      // Автофокус на первый интерактивный элемент или указанный ref
      const focusElement = initialFocusRef?.current || 
        modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
      
      setTimeout(() => {
        focusElement?.focus();
      }, 0);
    } else if (previousActiveElement.current) {
      // Возвращаем фокус при закрытии
      previousActiveElement.current.focus();
    }
  }, [isOpen, initialFocusRef]);

  // Обработчик клавиш (Esc для закрытия, Tab для focus trap)
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) return;

    // Закрытие по Esc
    if (event.key === 'Escape' && onClose) {
      event.preventDefault();
      onClose();
      return;
    }

    // Focus Trap для Tab
    if (event.key === 'Tab') {
      const modalElement = modalRef.current;
      if (!modalElement) return;

      const focusableElements = modalElement.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift + Tab
      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } 
      // Tab
      else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }, [isOpen, onClose]);

  // Получение ARIA атрибутов для диалога
  const getDialogProps = useCallback(() => {
    const props: {
      role: string;
      'aria-modal': string;
      'aria-labelledby'?: string;
    } = {
      role: 'dialog',
      'aria-modal': 'true',
    };

    // Добавляем aria-labelledby если есть заголовок
    const titleElement = modalRef.current?.querySelector('[id^="modal-title"]');
    if (titleElement?.id) {
      props['aria-labelledby'] = titleElement.id;
    }

    return props;
  }, []);

  return {
    modalRef,
    handleKeyDown,
    getDialogProps,
  };
}
