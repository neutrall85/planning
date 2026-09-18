// src/components/Select.jsx
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  SELECT_SEARCH_THRESHOLD,
  SELECT_POPUP_MAX_HEIGHT,
} from '../utils/constants';

/**
 * Кастомный выпадающий список с поиском и множественным выбором.
 *
 * Позиционирование попапа - через CSS-переменные --select-popup-*
 * (паттерн useStableModalHeight / TaskProgress / WorkloadBar).
 * В JSX попапа никаких style={{}} - разметка чистая, все значения
 * живут в .custom-select-popup и модификаторах.
 *
 * Ширина: min-width = ширина триггера, ширина по контенту (max-content),
 * max-width = вьюпорт минус отступы. Если попап шире триггера и у правого
 * края не влезает - сдвигаем left, прижимая попап к правому краю экрана.
 */
export const Select = ({
  id,
  value,
  onChange,
  options,
  disabled,
  placeholder = '-',
  className = '',
  multiple = false,
  searchable,
  emptyMessage = 'Ничего не найдено',
  searchPlaceholder = 'Поиск...',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const searchInputRef = useRef(null);

  const values = multiple && Array.isArray(value) ? value : [];
  const selectedSingle = multiple
    ? null
    : options.find(o => String(o.value) === String(value));

  const shouldSearch = searchable === undefined
    ? options.length > SELECT_SEARCH_THRESHOLD
    : searchable;

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const openPopup = () => {
    if (disabled) return;
    setSearch('');
    setHighlightIndex(-1);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSearch('');
    setHighlightIndex(-1);
  };

  const toggle = () => (open ? close() : openPopup());

  /**
   * Позиционирование попапа. Выполняется в useLayoutEffect до первого
   * пейнта - чтобы не было «прыжка» из дефолтной позиции в вычисленную.
   *
   * Порядок: выставляем left/top/min-width по триггеру, затем, после
   * того как попап отрендерился и известен его offsetWidth, корректируем
   * left, если попап выходит за правый край экрана. Высоту не считаем -
   * max-height: 300px (SELECT_POPUP_MAX_HEIGHT) и overflow-y: auto в CSS
   * сами разрулят.
   */
  useLayoutEffect(() => {
    if (!open || !popupRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popup = popupRef.current;
    const popupWidth = popup.offsetWidth;
    const vw = window.innerWidth;
    const EDGE = 8;

    // Вертикаль: если снизу меньше SELECT_POPUP_MAX_HEIGHT, а сверху
    // больше - открываем вверх, привязав низ попапа к верху триггера.
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const openUp = spaceBelow < SELECT_POPUP_MAX_HEIGHT && spaceAbove > spaceBelow;

    // Горизонталь: по умолчанию левый край = левому краю триггера.
    // Если попап не влезает справа - сдвигаем влево, но не за левый край.
    let left = triggerRect.left;
    if (left + popupWidth > vw - EDGE) {
      left = Math.max(EDGE, vw - popupWidth - EDGE);
    }

    popup.style.setProperty('--select-popup-left', `${left}px`);
    popup.style.setProperty('--select-popup-min-width', `${triggerRect.width}px`);

    if (openUp) {
      popup.style.setProperty('--select-popup-top', 'auto');
      popup.style.setProperty(
        '--select-popup-bottom',
        `${window.innerHeight - triggerRect.top + 4}px`,
      );
    } else {
      popup.style.setProperty('--select-popup-top', `${triggerRect.bottom + 4}px`);
      popup.style.setProperty('--select-popup-bottom', 'auto');
    }
  }, [open, filtered.length]);

  // Закрытие по клику вне и Escape. Слушаем keydown в capture-фазе, чтобы
  // Escape гасил именно попап, а не родительскую модалку (Modal.jsx слушает
  // window в bubble-фазе - stopPropagation в capture не даёт событию дойти).
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  // Навигация по списку с клавиатуры. Слушатель на документе: попап
  // рендерится в портал, и фокус остаётся на кнопке-триггере.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex(i => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex(i => Math.max(0, i - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setHighlightIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setHighlightIndex(filtered.length - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIndex >= 0 && filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex]);
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, filtered, highlightIndex, multiple, values]);

  useEffect(() => {
    if (open && shouldSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open, shouldSearch]);

  useEffect(() => {
    if (highlightIndex >= filtered.length) {
      setHighlightIndex(filtered.length - 1);
    }
  }, [filtered.length, highlightIndex]);

  const handleSelect = (opt) => {
    if (multiple) {
      const selectedKeys = new Set(values.map(String));
      const key = String(opt.value);
      if (selectedKeys.has(key)) selectedKeys.delete(key);
      else selectedKeys.add(key);
      // Порядок = порядок опций, а не порядок кликов.
      const next = options
        .map(o => o.value)
        .filter(v => selectedKeys.has(String(v)));
      onChange(next);
    } else {
      onChange(opt.value);
      close();
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!open) {
        e.preventDefault();
        openPopup();
      }
    }
  };

  const renderTriggerContent = () => {
    if (multiple) {
      if (values.length === 0) {
        return <span className="text-mut">{placeholder}</span>;
      }
      return <span>Выбрано: {values.length}</span>;
    }
    return (
      <span className={selectedSingle ? '' : 'text-mut'}>
        {selectedSingle ? selectedSingle.label : placeholder}
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        id={id}
        ref={triggerRef}
        className={`inp sel custom-select-trigger ${className}`}
        onClick={toggle}
        onKeyDown={handleTriggerKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="custom-select-trigger-content">
          {renderTriggerContent()}
        </span>
        <span className="custom-select-arrow">▾</span>
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          className="custom-select-popup"
          role="listbox"
          aria-multiselectable={multiple || undefined}
        >
          {shouldSearch && (
            <div className="custom-select-search">
              <input
                ref={searchInputRef}
                className="inp inp-sm"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="custom-select-list">
            {filtered.map((o, idx) => {
              const isSelected = multiple
                ? values.some(v => String(v) === String(o.value))
                : String(o.value) === String(value);
              const isHighlighted = idx === highlightIndex;
              return (
                <div
                  key={String(o.value)}
                  className={
                    'custom-select-option' +
                    (isSelected ? ' on' : '') +
                    (isHighlighted ? ' hl' : '')
                  }
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(o)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                >
                  {multiple && (
                    <span className={`custom-select-check${isSelected ? ' on' : ''}`}>
                      {isSelected ? '✓' : ''}
                    </span>
                  )}
                  <span className="custom-select-option-label">{o.label}</span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="custom-select-empty">{emptyMessage}</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};