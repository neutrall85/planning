import { useState, useCallback } from 'react';

/**
 * Универсальный хук для drag‑and‑drop в канбан‑доске.
 * Управляет состоянием перетаскивания и вычисляет индекс вставки.
 *
 * @param {Function} onMove - функция (itemId, newStatus) => void
 * @returns {Object} { dragState, handlers, resetDrag }
 */
export function useDragAndDrop(onMove) {
  const [dragItemId, setDragItemId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = useCallback((e, itemId) => {
    setDragItemId(itemId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragItemId(null);
    setDragOverCol(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e, status) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(status);

    const container = e.currentTarget.querySelector('.kcol-body');
    if (!container) return;

    const cards = container.querySelectorAll('.kcard');
    let idx = cards.length;

    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        idx = i;
        break;
      }
    }
    setDragOverIndex(idx);
  }, []);

  const handleDrop = useCallback((e, status) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      onMove(id, status);
    }
    handleDragEnd();
  }, [onMove, handleDragEnd]);

  return {
    dragState: { dragItemId, dragOverCol, dragOverIndex },
    handlers: {
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    resetDrag: handleDragEnd,
  };
}