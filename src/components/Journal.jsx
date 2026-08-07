import React, { useState, useMemo } from 'react';
import { fmtDT, fmtDMY } from '../utils/date';
import { useDataHelpers } from '../hooks';
import { Ic, ICONS } from './Icons';

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
  const { empName } = useDataHelpers(db);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userId: 'all',
    action: 'all',
    search: '',
  });
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const allEntries = useMemo(() => {
    return [...(db.audit || [])].sort((a, b) => b.ts - a.ts);
  }, [db.audit]);

  const userOptions = useMemo(() => {
    const userIds = new Set(allEntries.map(e => e.userId).filter(id => id !== 'system'));
    return [...userIds].map(id => ({ id, name: empName(id) || id }));
  }, [allEntries, empName]);

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
  const paginated = useMemo(() => {
    const flat = [];
    groupedEntries.forEach(g => g.entries.forEach(e => flat.push(e)));
    return flat.slice((page - 1) * pageSize, page * pageSize);
  }, [groupedEntries, page]);

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
        return (
          <div style={{ fontSize: '12px', color: 'var(--mut)', marginTop: '2px' }}>
            {Object.entries(obj).map(([key, val]) => (
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
      const user = e.userId === 'system' ? 'Система' : empName(e.userId) || e.userId;
      const details = typeof e.details === 'string' ? e.details.replace(/"/g, '""') : '';
      return [date, time, user, e.action, `"${details}"`].join(';');
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
              (показано {paginated.length})
            </span>
          </span>
          <button className="btn primary sm" onClick={exportToCSV}>
            Выгрузить CSV
          </button>
        </div>
        
        {/* Группировка по месяцам и дням */}
        <div style={{ marginBottom: '16px' }}>
          {groupedEntries.map(group => (
            <div key={group.date} style={{ marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: 'bold', 
                color: 'var(--muted)', 
                marginBottom: '4px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '4px'
              }}>
                {group.date}
              </div>
              <table className="tbl" style={{ minWidth: '700px', fontSize: '13px' }}>
                <tbody>
                  {group.entries.map(entry => (
                    <tr key={entry.id}>
                      <td className="mut sm" style={{ whiteSpace: 'nowrap' }}>{fmtDT(entry.ts)}</td>
                      <td>
                        <b>{entry.userId === 'system' ? 'Система' : empName(entry.userId) || entry.userId}</b>
                      </td>
                      <td><b>{entry.action}</b></td>
                      <td>
                        {renderDetails(entry)}
                        {entry.targetType && (
                          <div className="mut sm" style={{ fontSize: '11px' }}>
                            {entry.targetType}: {entry.targetId}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {groupedEntries.length === 0 && (
            <div className="mut" style={{ textAlign: 'center', padding: '20px' }}>Нет записей аудита</div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
            <button
              className="btn ghost sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              &lt;
            </button>
            <span style={{ alignSelf: 'center', fontSize: '13px' }}>
              Страница {page} из {totalPages}
            </span>
            <button
              className="btn ghost sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              &gt;
            </button>
          </div>
        )}
      </div>
    </div>
  );
}