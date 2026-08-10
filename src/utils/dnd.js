// Утилиты для Drag-and-Drop

/**
 * Обработчик события dragover с позиционированием плейсхолдера
 */
export const handleDragOver = (e) => {
  e.preventDefault();
  const card = e.target.closest('.kanban-card, .project-card');
  if (card) {
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      card.before(e.target.closest('.drag-placeholder') || createPlaceholder());
    } else {
      card.after(e.target.closest('.drag-placeholder') || createPlaceholder());
    }
  } else {
    const column = e.target.closest('.kanban-column, .project-column');
    if (column) {
      const list = column.querySelector('.kanban-list, .project-list');
      if (list && !list.querySelector('.drag-placeholder')) {
        list.appendChild(createPlaceholder());
      }
    }
  }
};

/**
 * Создание визуального плейсхолдера для drag-and-drop
 */
const createPlaceholder = () => {
  const ph = document.createElement('div');
  ph.className = 'drag-placeholder';
  ph.style.height = '100px';
  ph.style.background = '#f0f0f0';
  ph.style.border = '2px dashed #ccc';
  ph.style.margin = '8px';
  ph.style.borderRadius = '8px';
  return ph;
};

/**
 * Обработчик события dragleave
 */
export const handleDragLeave = (e) => {
  const placeholder = document.querySelector('.drag-placeholder');
  if (placeholder && !e.target.closest('.kanban-column, .project-column, .kanban-card, .project-card')) {
    placeholder.remove();
  }
};

/**
 * Получение данных о позиции drop
 */
export const getDropTarget = (e, columnId) => {
  const placeholder = document.querySelector('.drag-placeholder');
  if (!placeholder) return { columnId, index: -1 };
  
  const column = placeholder.closest('.kanban-column, .project-column');
  const newColumnId = column ? column.dataset.columnId || columnId : columnId;
  
  const list = column?.querySelector('.kanban-list, .project-list') || document.querySelector(`[data-column-id="${columnId}"] .kanban-list, [data-column-id="${columnId}"] .project-list`);
  if (!list) return { columnId: newColumnId, index: -1 };
  
  const items = Array.from(list.querySelectorAll('.kanban-card, .project-card')).filter(el => el !== placeholder);
  const index = Array.from(list.children).indexOf(placeholder);
  
  return { columnId: newColumnId, index: Math.min(index, items.length) };
};

/**
 * Очистка плейсхолдера после завершения drag-and-drop
 */
export const cleanupPlaceholder = () => {
  const placeholder = document.querySelector('.drag-placeholder');
  if (placeholder) placeholder.remove();
};
