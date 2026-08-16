import React, { useState, useMemo } from 'react';
import { fmtDT, fmtDMY, initials } from '../utils/date';
import { Ic, ICONS } from './Icons';
import EmployeeTooltip from './EmployeeTooltip';

const ACTIONS = [
  { value: 'all', label: 'Все действия' },
  { value: 'Создание задачи', label: 'Создание задачи' },
  { value: 'Изменение задачи', label: 'Изменение задачи' },
  { value: 'Удаление задачи', label: 'Удаление задачи' },
  { value: 'Изменение статуса задачи', label: 'Изменение статуса' },
  { value: 'Создание проекта', label: 'Создание проекта' },
  { value: 'Изменение проекта', label: 'Изменение проекта' },
  { value: 'Удаление проекта', label: 'Удаление проекта' },
  { value: 'Архивация проекта', label: 'Архивация проекта' },
  { value: 'Создание сотрудника', label: 'Создание сотрудника' },
  { value: 'Изменение ролей', label: 'Изменение ролей' },
  { value: 'Изменение подразделений', label: 'Изменение подразделений' },
  { value: 'Увольнение сотрудника', label: 'Увольнение сотрудника' },
  { value: 'Восстановление сотрудника', label: 'Восстановление сотрудника' },
  { value: 'Создание отпуска', label: 'Создание отпуска' },
  { value: 'Изменение отпуска', label: 'Изменение отпуска' },
  { value: 'Удаление отпуска', label: 'Удаление отпуска' },
  { value: 'Запрос изменения часов', label: 'Запрос изменения часов' },
  { value: 'Утверждение запроса часов', label: 'Утверждение запроса часов' },
  { value: 'Отклонение запроса часов', label: 'Отклонение запроса часов' },
  { value: 'Создание делегирования ролей', label: 'Делегирование ролей' },
  { value: 'Принятие делегирования', label: 'Принятие делегирования' },
  { value: 'Отклонение делегирования', label: 'Отклонение делегирования' },
  { value: 'Автоматическая архивация задач', label: 'Автоматическая архивация' },
  { value: 'Утверждение отпуска', label: 'Утверждение отпуска' },
  { value: 'Отклонение отпуска', label: 'Отклонение отпуска' },
  { value: 'Одобрение регистрации', label: 'Одобрение регистрации' },
  { value: 'Отклонение регистрации', label: 'Отклонение регистрации' },
];

export default function Journal({ db }) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userId: 'all',
    action: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const [tooltip, setTooltip] = useState({ visible: false, employee: null, x: 0, y: 0 });
  const pageSize = 20;

  const allEntries = useMemo(() => {
    return [...(db.audit || [])].sort((a, b) => b.ts - a.ts);
  }, [db.audit]);

  const userOptions = useMemo(() => {
    const userIds = new Set(allEntries.map(e => e.userId).filter(id => id !== 'system'));
    return Array.from(userIds).map(id => {
      const emp = db.employees.find(e => e.id === id);
      return { id, name: emp ? `${emp.first} ${emp.last}` : `ID:${id}` };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [allEntries, db.employees]);

  const filteredEntries = useMemo(() => {
    return allEntries.filter(entry => {
      const entryDate = fmtDMY(entry.ts);
      if (filters.dateFrom && entryDate < filters.dateFrom) return false;
      if (filters.dateTo && entryDate > filters.dateTo) return false;
      if (filters.userId !== 'all' && entry.userId !== filters.userId) return false;
      if (filters.action !== 'all' && entry.action !== filters.action) return false;
      if (filters.search.trim()) {
        const q = filters.search.trim().toLowerCase();
        const match = (entry.action || '').toLowerCase().includes(q) ||
                      (entry.details || '').toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [allEntries, filters]);

  // Группировка по датам (день/месяц)
  const groupedEntries = useMemo(() => {
    const groups = {};
    filteredEntries.forEach(entry => {
      const d = new Date(entry.ts);
      const dayKey = fmtDMY(entry.ts);
      const monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
      
      if (!groups[monthKey]) groups[monthKey] = {};
      if (!groups[monthKey][dayKey]) groups[monthKey][dayKey] = [];
      groups[monthKey][dayKey].push(entry);
    });
    
    // Сортировка месяцев (от новых к старым)
    const sortedMonths = Object.keys(groups).sort((a, b) => {
      const [m1, y1] = a.split('.').map(Number);
      const [m2, y2] = b.split('.').map(Number);
      return y2 - y1 || m2 - m1;
    });
    
    const result = [];
    sortedMonths.forEach(month => {
      const days = Object.keys(groups[month]).sort((a, b) => {
        const [d1, m1, y1] = a.split('.').map(Number);
        const [d2, m2, y2] = b.split('.').map(Number);
        return y2 - y1 || m2 - m1 || d2 - d1;
      });
      days.forEach(day => {
        result.push({ type: 'day', date: day, entries: groups[month][day] });
      });
    });
    return result;
  }, [filteredEntries]);

  const totalEntries = filteredEntries.length;

  const totalPages = Math.ceil(totalEntries / pageSize);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const renderDetails = (entry) => {
    if (!entry.details) return null;
    try {
      const obj = typeof entry.details === 'string' ? JSON.parse(entry.details) : entry.details;
      if (typeof obj === 'object') {
        const { justification, ...rest } = obj;
        return (
          <div style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '2px' }}>
            {justification && <div style={{ marginBottom: '4px' }}><b>Обоснование:</b> {justification}</div>}
            {Object.entries(rest).map(([key, val]) => (
              <div key={key}><b>{key}:</b> {String(val)}</div>
            ))}
          </div>
        );
      }
      return <span className="mut sm">{String(entry.details)}</span>;
    } catch {
      return <span className="mut sm">{String(entry.details)}</span>;
    }
  };

  const exportToCSV = () => {
    const headers = ['Дата', 'Время', 'Пользователь', 'Действие', 'Детали'];
    const rows = filteredEntries.map(e => {
      const d = new Date(e.ts);
      const date = fmtDMY(e.ts);
      const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const details = typeof e.details === 'string' ? e.details.replace(/"/g, '""') : '';
      const emp = e.userId === 'system' ? { first: 'System', last: '' } : db.employees.find(emp => emp.id === e.userId);
      const userName = emp ? `${emp.first} ${emp.last}`.trim() : `ID:${e.userId}`;
      return [date, time, userName, e.action, `"${details}"`].join(';');
    });
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `journal_${filters.dateFrom || 'start'}_${filters.dateTo || 'end'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Плоский список для пагинации
  const flatEntries = useMemo(() => {
    const result = [];
    let lastMonth = null;
    
    groupedEntries.forEach(group => {
      // group.date имеет формат DD.MM.YYYY, преобразуем правильно
      const parts = group.date.split('.');
      if (parts.length !== 3) return;
      const [, monthStr, yearStr] = parts.map(Number);
      const monthDate = new Date(yearStr, monthStr - 1, 1);
      const monthLabel = !isNaN(monthDate.getTime()) 
        ? monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
        : `${monthStr}.${yearStr}`;
      
      group.entries.forEach((entry, idx) => {
        const isFirstInDay = idx === 0;
        const entryDate = new Date(entry.ts);
        const dayLabel = isFirstInDay && !isNaN(entryDate.getTime()) ? entryDate.toLocaleDateString('ru-RU', { 
          weekday: 'long', 
          day: 'numeric' 
        }) : null;
        
        result.push({
          ...entry,
          _monthLabel: lastMonth !== monthLabel ? monthLabel : null,
          _dayLabel: dayLabel,
        });
        
        if (lastMonth !== monthLabel) {
          lastMonth = monthLabel;
        }
      });
    });
    
    return result;
  }, [groupedEntries]);

  const paginatedFlat = useMemo(() => {
    return flatEntries.slice((page - 1) * pageSize, page * pageSize);
  }, [flatEntries, page]);

  return (
    <div className="rep">
      <div className="rep-panel" style={{ padding: '16px' }}>
        <div className="rep-panel-title">Фильтры журнала</div>
        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <label className="lbl" style={{ margin: 0 }}>С даты:</label>
          <input
            className="inp"
            type="date"
            value={filters.dateFrom}
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
            style={{ width: '150px' }}
          />
          <span>—</span>
          <input
            className="inp"
            type="date"
            value={filters.dateTo}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
            style={{ width: '150px' }}
          />

          <label className="lbl" style={{ margin: 0 }}>Пользователь:</label>
          <select
            className="inp sel"
            value={filters.userId}
            onChange={e => handleFilterChange('userId', e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Все</option>
            {userOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Действие:</label>
          <select
            className="inp sel"
            value={filters.action}
            onChange={e => handleFilterChange('action', e.target.value)}
            style={{ width: '200px' }}
          >
            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
            <Ic d={ICONS.search} size={15} />
            <input
              placeholder="Поиск по действию или деталям..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rep-panel" style={{ padding: '16px' }}>
        <div className="rep-panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>
            Всего записей: {filteredEntries.length}
            <span className="mut sm" style={{ marginLeft: '12px', fontWeight: 'normal' }}>
              (показано {paginatedFlat.length})
            </span>
          </span>
          <button className="btn primary sm" onClick={exportToCSV}>
            Выгрузить CSV
          </button>
        </div>
        
        <div style={{ marginTop: '12px' }}>
          {paginatedFlat.length === 0 ? (
            <div className="mut" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Записей не найдено</div>
              <div className="mut sm">Измените параметры фильтра или выберите другой период</div>
            </div>
          ) : (
            <table className="tbl" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={{ width: '160px', color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Дата и время
                  </th>
                  <th style={{ width: '180px', color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Пользователь
                  </th>
                  <th style={{ color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Действие
                  </th>
                  <th style={{ color: 'var(--mut)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>
                    Детали
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedFlat.map((entry, index) => {
                  const showMonth = entry._monthLabel !== null;
                  const showDay = entry._dayLabel !== null;
                  
                  return (
                    <React.Fragment key={entry.id}>
                      {showMonth && (
                        <tr>
                          <td colSpan="4" style={{ 
                            background: 'linear-gradient(90deg, #f8fafc, transparent)', 
                            padding: '12px 10px 8px',
                            borderTop: index === 0 ? 'none' : '2px solid var(--line)',
                          }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: 800, 
                              color: '#1e293b',
                              textTransform: 'capitalize',
                              letterSpacing: '0.3px',
                            }}>
                              {entry._monthLabel}
                            </div>
                          </td>
                        </tr>
                      )}
                      {showDay && (
                        <tr>
                          <td colSpan="4" style={{ 
                            padding: '8px 10px 6px',
                            borderTop: '1px dashed #e2e8f0',
                          }}>
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: 700, 
                              color: 'var(--acc)',
                              textTransform: 'capitalize',
                              letterSpacing: '0.3px',
                            }}>
                              {entry._dayLabel}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr style={{ 
                        background: showDay ? '#fafbff' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = showDay ? '#f0f7ff' : '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.background = showDay ? '#fafbff' : 'transparent'}
                      >
                        <td style={{ 
                          whiteSpace: 'nowrap', 
                          fontSize: '12px',
                          color: 'var(--mut)',
                          fontFamily: 'monospace',
                        }}>
                          {fmtDT(entry.ts)}
                        </td>
                        <td>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 600,
                            fontSize: '13px',
                          }}>
                            {entry.userId === 'system' ? (
                              <div className="avatar xs" style={{
                                background: 'linear-gradient(135deg, #64748b, #475569)',
                                width: '24px',
                                height: '24px',
                                fontSize: '9px',
                              }}>
                                S
                              </div>
                            ) : (() => {
                              const emp = db.employees.find(e => e.id === entry.userId);
                              return emp ? (
                                <span
                                  className="avatar xs"
                                  onMouseEnter={(e) => setTooltip(prev => ({ ...prev, visible: true, employee: emp, x: e.clientX, y: e.clientY }))}
                                  onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                                  onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                                  style={{ cursor: 'pointer' }}
                                >
                                  {emp.photo ? (
                                    <img src={emp.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                  ) : (
                                    initials(emp.first, emp.last)
                                  )}
                                </span>
                              ) : (
                                <div className="avatar xs" style={{
                                  background: 'linear-gradient(135deg, #1e3a8a, #0ea5e9)',
                                  width: '24px',
                                  height: '24px',
                                  fontSize: '9px',
                                }}>
                                </div>
                              );
                            })()}
                          </div>
                        </td>
                        <td>
                          <div style={{ 
                            fontWeight: 600, 
                            fontSize: '13px',
                            color: '#1e293b',
                          }}>
                            {entry.action}
                          </div>
                        </td>
                        <td style={{ maxWidth: '400px' }}>
                          {renderDetails(entry)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '12px', 
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--line)',
          }}>
            <button
              className="btn ghost sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ 
                minWidth: '36px',
                height: '36px',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &larr;
            </button>
            <span style={{ 
              fontSize: '13px', 
              color: 'var(--mut)',
              fontWeight: 500,
            }}>
              Страница <b style={{ color: 'var(--txt)' }}>{page}</b> из <b style={{ color: 'var(--txt)' }}>{totalPages}</b>
            </span>
            <button
              className="btn ghost sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ 
                minWidth: '36px',
                height: '36px',
                padding: '0',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &rarr;
            </button>
          </div>
        )}
      </div>
      {/* Tooltip сотрудника */}
      <EmployeeTooltip {...tooltip} />
    </div>
  );
}
