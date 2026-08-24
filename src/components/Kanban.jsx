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
  columns, // новый пропс
}) {
  const [dragOverCol, setDragOverCol] = useState(null);

  // Определяем классы и стили
  const kanbanClasses = ['kanban'];
  const style = {};

  if (columns) {
    // Если задано явное количество колонок – устанавливаем CSS-переменную
    style['--columns'] = columns;
    // Не добавляем класс k5, так как переменная перекроет его
  } else {
    // Иначе – старое поведение: если статусов 5, добавляем класс k5
    if (statusOrder.length === 5) {
      kanbanClasses.push('k5');
    }
    // Если статусов не 5, то используем стандартный стиль (4 колонки)
    // Без переменной --columns будет использовано значение по умолчанию из CSS
  }

  return (
    <div>
      {/* Панель инструментов (без изменений) */}
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
          <label className="dept-pick" style={{ marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={showOnlyMy}
              onChange={(e) => onToggleMy(e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Только мои</span>
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