// src/components/Select.jsx
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const POPUP_MAX = 300;   // максимальная высота выпадающего меню
const SEARCH_THRESHOLD = 10; // при каком количестве опций показывать поиск

export const Select = ({ value, onChange, options, disabled, placeholder = '—', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: undefined, bottom: undefined, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const selected = options.find(o => String(o.value) === String(value));

  const openPopup = () => {
    if (disabled) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < POPUP_MAX && spaceAbove > spaceBelow;
    setPos({
      left: rect.left,
      width: rect.width,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
    });
    setSearch('');
    setOpen(true);
  };

  const toggle = () => (open ? setOpen(false) : openPopup());

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (popupRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={`inp sel custom-select-trigger ${className}`}
        onClick={toggle}
        disabled={disabled}
      >
        <span className={selected ? '' : 'text-mut'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="custom-select-arrow">▾</span>
      </button>

      {open && createPortal(
        <div
          ref={popupRef}
          className="custom-select-popup"
          style={{
            position: 'fixed',
            left: pos.left,
            top: pos.top,
            bottom: pos.bottom,
            width: pos.width,
          }}
        >
          {options.length > SEARCH_THRESHOLD && (
            <div className="custom-select-search">
              <input
                autoFocus
                className="inp inp-sm"
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <div className="custom-select-list">
            {filtered.map(o => (
              <div
                key={o.value}
                className={`custom-select-option${String(o.value) === String(value) ? ' on' : ''}`}
                onClick={() => { onChange(o.value); setOpen(false); }}
              >
                {o.label}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="custom-select-empty">Ничего не найдено</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};