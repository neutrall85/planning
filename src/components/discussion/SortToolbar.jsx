import React from 'react';
import { SORT_OPTIONS } from './constants';

export default function SortToolbar({ value, onChange }) {
  return (
    <div className="discussion-toolbar">
      <span className="toolbar-label">Сортировка:</span>
      <div className="seg sm">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={`seg-btn${value === opt.id ? ' on' : ''}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}