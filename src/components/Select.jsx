// src/components/Select.jsx
import { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  SELECT_SEARCH_THRESHOLD,
  SELECT_POPUP_MAX_HEIGHT,
} from '../utils/constants';
import { sortOptions } from '../utils/selectOptions';

/**
 * Кастомный выпадающий список с поиском и множественным выбором.
 *
 * Порядок опций нормализуется здесь: sortOptions поднимает служебные
 * пункты ('', 'all', 'any', 'none') наверх, остальные раскладывает по
 * алфавиту. Правило одно на весь проект - вызывающий код про сортировку
 * не думает и не дублирует её в optionsFromMap / optionsFromList.
 *
 * Позиционирование попапа - через CSS-переменные --select-popup-*
 * (паттерн useStableModalHeight / TaskProgress / WorkloadBar).
 * В JSX попапа никаких style={{}} - разметка чистая, все значения
 * живут в .custom-select-popup и модификаторах.
 *
 * Навигация с клавиатуры - через onKeyDown на самом попапе, не через
 * document-listener. Это принципиально: в проекте на keydown документа
 * уже висят Modal (Escape), useNestedModalEscape (Escape, capture на
 * window) и FloatingMenu (через useNestedModalEscape). Ещё один
 * document-listener, который при этом пересоздаётся при каждом рендере
 * (values в deps - новый массив для single-режима), давал гонку: нажатие
 * стрелки уходило в устаревшее замыкание и подсветка сбрасывалась на
 * первый элемент. Обработчик на попапе этой гонки не имеет - React
 * пересоздаёт его сам на каждом рендере, значения всегда актуальные.
 *
 * Escape остаётся на документе (capture): он должен срабатывать, даже
 * когда фокус на триггере, а не на попапе.
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

  /**
   * Опции в том порядке, в котором их увидит пользователь. useMemo по
   * ссылке options - сортировка не пересчитывается, пока вызывающий код
   * не пересоздал массив (а он этого не делает: списки собраны в
   * useMemo либо на уровне модуля).
   */
  const sortedOptions = useMemo(() => sortOptions(options), [options]);

  const selectedSingle = multiple
    ? null
    : sortedOptions.find(o => String(o.value) === String(value));

  const shouldSearch = searchable === undefined
    ? sortedOptions.length > SELECT_SEARCH_THRESHOLD
    : searchable;

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedOptions;
    const q = search.toLowerCase();
    return sortedOptions.filter(o => o.label.toLowerCase().includes(q));
  }, [sortedOptions, search]);

  const openPopup = () => {
    if (disabled) return;
    setSearch('');
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setSearch('');
    setHighlightIndex(-1);
  };

  const toggle = () => (open ? close() : openPopup());

  /**
   * Автоподсветка при открытии и при изменении строки поиска.
   *
   * Правила:
   *   - поиск не пуст → подсветить первый подходящий;
   *   - поиск пуст, single, есть выбранное → подсветить его;
   *   - иначе → подсветить первый.
   *
   * highlightIndex в deps нет: эффект реагирует на «открылись» и
   * «поиск изменился», а не на навигацию. Иначе каждое нажатие стрелки
   * сбрасывало бы выделение на первый элемент.
   */
  useEffect(() => {
    if (!open) return;

    if (filtered.length === 0) {
      setHighlightIndex(-1);
      return;
    }

    if (search.trim()) {
      setHighlightIndex(0);
      return;
    }

    if (!multiple && value !== null && value !== undefined && value !== '') {
      const idx = filtered.findIndex(o => String(o.value) === String(value));
      setHighlightIndex(idx >= 0 ? idx : 0);
      return;
    }

    setHighlightIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search]);

  /**
   * Фокус на попап при открытии - чтобы keydown-события шли из него.
   *
   * Если попап searchable - фокус уходит на input поиска (см. отдельный
   * эффект ниже). Input внутри попапа, событие всё равно всплывёт до
   * onKeyDown попапа.
   */
  useEffect(() => {
    if (open && popupRef.current && !shouldSearch) {
      popupRef.current.focus();
    }
  }, [open, shouldSearch]);

  useEffect(() => {
    if (open && shouldSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open, shouldSearch]);

  /**
   * Позиционирование попапа. useLayoutEffect - до первого пейнта,
   * чтобы не было «прыжка» из дефолтной позиции в вычисленную.
   */
  useLayoutEffect(() => {
    if (!open || !popupRef.current || !triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const popup = popupRef.current;
    const popupWidth = popup.offsetWidth;
    const vw = window.innerWidth;
    const EDGE = 8;

    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const openUp = spaceBelow < SELECT_POPUP_MAX_HEIGHT && spaceAbove > spaceBelow;

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

  // Закрытие по клику вне и Escape.
  //
  // Escape слушаем в capture-фазе на документе: попап рендерится в
  // портал и может не иметь фокуса, если пользователь кликнул на
  // триггер и потом отпустил - keydown должен всё равно закрыть попап,
  // а не родительскую модалку. stopPropagation в capture не даёт
  // событию дойти до Modal.jsx, который слушает в bubble-фазе.
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

  const handleSelect = (opt) => {
    if (multiple) {
      const selectedKeys = new Set(values.map(String));
      const key = String(opt.value);
      if (selectedKeys.has(key)) selectedKeys.delete(key);
      else selectedKeys.add(key);
      const next = sortedOptions
        .map(o => o.value)
        .filter(v => selectedKeys.has(String(v)));
      onChange(next);
    } else {
      onChange(opt.value);
      close();
    }
  };

  /**
   * Клавиатура на попапе. React пересоздаёт этот обработчик на каждом
   * рендере - filtered / highlightIndex / handleSelect всегда актуальны,
   * без refs и без риска гонки. Событие от input поиска всплывает сюда
   * (input внутри попапа), так что один обработчик покрывает оба случая:
   * фокус на попапе и фокус на поиске.
   */
  const handlePopupKeyDown = (e) => {
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

  const handleTriggerKeyDown = (e) => {
    if (disabled) return;
    // Стрелка на закрытом триггере открывает попап. При открытом попапе
    // фокус уходит в попап, и сюда событие не доходит.
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openPopup();
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
          tabIndex={-1}
          onKeyDown={handlePopupKeyDown}
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