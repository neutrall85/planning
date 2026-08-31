import React, { useState } from 'react';
import { Ic, ICONS } from './Icons';

export default function Kanban({
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

  const kanbanClasses = ['kanban'];
  const style = {};

  if (columns) {
    style['--columns'] = columns;
  } else {
    if (statusOrder.length === 5) {
      kanbanClasses.push('k5');
    }
  }

  return (
    <div>
      <div className="toolbar">
        {onSearchChange && (
          <div className="search-box">
            <Ic d={ICONS.search} size={15} />
            <input
              placeholder="Поиск…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
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
          const list = items.filter((item) => item.status === st);
          return (
            <div
              key={st}
              className={`kcol${dragOverCol === st ? ' over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(st);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                const id = e.dataTransfer.getData('text/plain');
                if (id) {
                  onDrop(id, st);
                }
              }}
            >
              <div className="kcol-head">
                <span className="kdot" style={{ background: statusMap[st].color }} />
                {statusMap[st].label}
                <span className="kcount">{list.length}</span>
              </div>
              <div className="kcol-body">
                {list.length === 0 ? (
                  <div className="kempty">{emptyMessage}</div>
                ) : (
                  list.map((item) => (
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
        })}
      </div>
    </div>
  );
}