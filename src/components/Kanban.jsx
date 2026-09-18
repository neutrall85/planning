import React, { useState, useMemo, memo } from 'react';
import { Ic, ICONS } from './Icons';
import { SearchBox } from './SearchBox';

/**
 * Одна колонка канбана.
 *
 * memo-компонент: самодостаточная единица перерисовки. Когда состояние
 * `dragOverCol` в родителе меняется (курсор вошёл в другую колонку),
 * родитель передаёт каждой колонке новый булев `isDragOver`. У колонок,
 * которые не были затронуты, флаг остаётся тем же - их memo сравнивает
 * пропсы и пропускает рендер. Перерисовываются ровно две колонки:
 * та, где курсор был, и та, куда он вошёл.
 *
 * Раньше dragOverCol жил на уровне всего Kanban и на каждый hover
 * перерисовывались все колонки и все карточки внутри них.
 */
const KanbanColumn = memo(function KanbanColumn({
  status,
  label,
  color,
  items,
  renderCard,
  onDrop,
  onDragStateChange,
  isDragOver,
  emptyMessage,
}) {
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragOver) onDragStateChange(status);
  };
  const handleDragLeave = () => {
    if (isDragOver) onDragStateChange(null);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    onDragStateChange(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onDrop(id, status);
  };

  return (
    <div
      className={`kcol${isDragOver ? ' over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="kcol-head">
        <span className="kdot" style={{ background: color }} />
        {label}
        <span className="kcount">{items.length}</span>
      </div>
      <div className="kcol-body">
        {items.length === 0 ? (
          <div className="kempty">{emptyMessage}</div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="kcard"
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', item.id)}
            >
              {renderCard(item)}
            </div>
          ))
        )}
      </div>
    </div>
  );
});

function Kanban({
  items,
  statusOrder,
  statusMap,
  renderCard,
  onDrop,
  onNew,
  searchQuery,
  onSearchChange,
  showOnlyMy,
  onToggleMy,
  extraFilters,
  emptyMessage = 'Нет элементов',
  columns,
}) {
  const [dragOverCol, setDragOverCol] = useState(null);

  // Группировка по статусу - один раз на срез items/statusOrder.
  // Каждая колонка получает стабильную по ссылке «свою» половину;
  // повторные .filter по всем items убраны.
  const byStatus = useMemo(() => {
    const m = new Map();
    statusOrder.forEach(st => m.set(st, []));
    items.forEach(item => {
      const list = m.get(item.status);
      if (list) list.push(item);
    });
    return m;
  }, [items, statusOrder]);

  const kanbanClasses = ['kanban'];
  const style = {};

  if (columns) {
    style['--columns'] = columns;
  } else if (statusOrder.length === 5) {
    kanbanClasses.push('k5');
  }

  return (
    <div>
      <div className="toolbar">
        {onSearchChange && (
          <SearchBox
            value={searchQuery}
            onChange={onSearchChange}
            placeholder="Поиск…"
          />
        )}
        {extraFilters}
        {onToggleMy && (
          <label className="dept-pick ml-2">
            <input
              type="checkbox"
              checked={showOnlyMy}
              onChange={(e) => onToggleMy(e.target.checked)}
            />
            <span className="text-sm">Только мои</span>
          </label>
        )}
        {onNew && (
          <button className="btn primary" onClick={onNew}>
            <Ic d={ICONS.plus} size={15} /> Создать
          </button>
        )}
      </div>

      <div className={kanbanClasses.join(' ')} style={style}>
        {statusOrder.map((st) => {
          const meta = statusMap[st];
          return (
            <KanbanColumn
              key={st}
              status={st}
              label={meta.label}
              color={meta.color}
              items={byStatus.get(st) || []}
              renderCard={renderCard}
              onDrop={onDrop}
              onDragStateChange={setDragOverCol}
              isDragOver={dragOverCol === st}
              emptyMessage={emptyMessage}
            />
          );
        })}
      </div>
    </div>
  );
}

export default memo(Kanban);