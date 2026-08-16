import { useEffect, useState, useRef } from 'react';
import { initials } from '../utils/date';

export default function MentionPopup({ candidates, onSelect, searchQuery, anchorRef, renderItem }) {
  const [position, setPosition] = useState({ top: 0, left: 0, maxHeight: 200 });
  const popupRef = useRef();

  useEffect(() => {
    if (!anchorRef.current || candidates.length === 0) return;

    const rect = anchorRef.current.getBoundingClientRect();
    const popupHeight = Math.min(candidates.length * 36 + 10, 200);
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top, maxHeight;
    if (spaceAbove > spaceBelow) {
      // Показываем сверху
      top = rect.top - popupHeight - 4;
      maxHeight = Math.min(popupHeight, spaceAbove - 10);
    } else {
      // Показываем снизу
      top = rect.bottom + 4;
      maxHeight = Math.min(popupHeight, spaceBelow - 10);
    }

    setPosition({
      top: Math.max(10, top),
      left: Math.max(10, rect.left),
      maxHeight: Math.max(50, maxHeight),
    });
  }, [candidates, anchorRef]);

  if (candidates.length === 0) return null;

  return (
    <div
      ref={popupRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        maxHeight: position.maxHeight,
        overflowY: 'auto',
        backgroundColor: '#fff',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 9999,
        minWidth: '200px',
        padding: '4px 0',
      }}
    >
      {candidates.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          style={{
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          {renderItem ? renderItem(item) : (
            <>
              <span className="avatar xs">{initials(item.first, item.last)}</span>
              <span>{item.last} {item.first}</span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}