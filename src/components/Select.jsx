// src/components/Select.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { sortOptions } from '../utils/selectOptions';

/**
 * Кастомный выпадающий список с поиском и множественным выбором.
 *
 * Порядок опций нормализуется здесь: sortOptions поднимает служебные
 * пункты ('', 'all', 'any', 'none') наверх, остальные раскладывает по
 * алфавиту. Правило одно на весь проект - вызывающий код про сортировку
 * не думает и не дублирует её в optionsFromMap / optionsFromList.
 *
 * autoSort={false} отключает нормализацию: список рендерится в том
 * порядке, в каком его передал вызывающий. Нужно там, где порядок опций
 * семантичен и не совпадает с алфавитным - например, в SortControl, где
 * «По приоритету / По сроку / По названию» задан осмысленно, и
 * пересортировка по алфавиту его бы перемешала. Дефолт true сохраняет
 * прежнее поведение для всех остальных вызовов.
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
  autoSort = true,
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
   *
   * autoSort=false пропускает нормализацию: список рендерится в исходном
   * порядке. См. SortControl.
   */
  const sortedOptions = useMemo(
    () => (autoSort ? sortOptions(options) : options),
    [options, autoSort],
  );

  const selectedSingle = multiple
    ? null
    : sortedOptions.find(o => String(o.value) === String(value));

  const shouldSearch = searchable === undefined
    ? sortedOptions.length > 10
    : searchable;

  const filtered = useMemo(() => {
    if (!search.trim()) return sortedOptions;
    const q = search.toLowerCase();
    return sortedOptions.filter(o => o.label.toLowerCase().includes(q));
  }, [sortedOptions, search]);

  /**
   * Set выбранных значений для multiple-режима. Нужен и для проверки
   * «выбрано ли» в списке, и для рендера чипов в триггере: построение
   * один раз даёт O(N+M) вместо O(N*M) при каждом рендере.
   */
  const selectedSet = useMemo(
    () => new Set(values.map(String)),
    [values],
  );

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
  }, [open, search]);

  /**
   * Фокус на попап при открытии - чтобы keydown-события шли из него.
   *
   * Если попап searchable - фокус уходит на input поиска (см. отдельный
   * эффект ниже). Input внутри попапа, событие всё равно всплывёт до
   * onKeyDown попапа.
   */
  useEffect(() => {
    if (open && popupRef.current && !shouldSearch) popupRef.current.focus();
  }, [open, shouldSearch]);

  useEffect(() => {
    if (open && shouldSearch && searchInputRef.current) searchInputRef.current.focus();
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
    const openUp = spaceBelow < 300 && spaceAbove > spaceBelow;

    let left = triggerRect.left;
    if (left + popupWidth > vw - EDGE) left = Math.max(EDGE, vw - popupWidth - EDGE);

    popup.style.setProperty('--select-popup-left', `${left}px`);
    popup.style.setProperty('--select-popup-min-width', `${triggerRect.width}px`);

    if (openUp) {
      popup.style.setProperty('--select-popup-top', 'auto');
      popup.style.setProperty('--select-popup-bottom', `${window.innerHeight - triggerRect.top + 4}px`);
    } else {
      popup.style.setProperty('--select-popup-top', `${triggerRect.bottom + 4}px`);
      popup.style.setProperty('--select-popup-bottom', 'auto');
    }
  }, [open, filtered.length]);

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
      const next = new Set(selectedSet);
      const key = String(opt.value);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      onChange(
        sortedOptions
          .map(o => o.value)
          .filter(v => next.has(String(v))),
      );
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
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      openPopup();
    }
  };

  /**
   * Содержимое триггера.
   *
   * Single: единственная метка, обрезается многоточием через
   * .custom-select-single-label.
   *
   * Multiple: чипы с названиями выбранных значений. Показываются
   * первые MAX_VISIBLE_CHIPS, остальные сворачиваются в чип «+N».
   * Полный список остальных - в title-подсказке на «+N»: наведение
   * даёт полные имена без открытия попапа.
   *
   * Почему не «Выбрано: N», как раньше: пользователь, глядя на поле,
   * должен видеть, что именно он выбрал. Счётчик отвечает только на
   * «сколько», но не на «что» - и приходилось открывать попап, чтобы
   * вспомнить.
   */
  const renderTriggerContent = () => {
    if (multiple) {
      if (values.length === 0) {
        return <span className="custom-select-single-label text-mut">{placeholder}</span>;
      }
      const selected = sortedOptions.filter(o => selectedSet.has(String(o.value)));
      return (
        <span className="custom-select-chips">
          {selected.map(o => (
            <span
              key={String(o.value)}
              className="sel-chip"
              title={o.label}
            >
              {o.label}
            </span>
          ))}
        </span>
      );
    }
    return (
      <span className={`custom-select-single-label${selectedSingle ? '' : ' text-mut'}`}>
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
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="custom-select-list">
            {filtered.map((o, idx) => {
              const isSelected = multiple
                ? selectedSet.has(String(o.value))
                : String(o.value) === String(value);
              return (
                <div
                  key={String(o.value)}
                  className={
                    'custom-select-option'
                    + (isSelected ? ' on' : '')
                    + (idx === highlightIndex ? ' hl' : '')
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
        document.body,
      )}
    </>
  );
};