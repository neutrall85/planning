import React, { useState, useMemo } from 'react';
import { fmtDT, fmtDMY } from '../utils/date';
import { useDataHelpers } from '../hooks';
import { Ic, ICONS } from './Icons';

const safeDate = (ts) => {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
};

const parseDayKey = (dayKey) => {
  const parts = dayKey.split('.');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
};

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
      const dateObj = safeDate(entry.ts);
      if (!dateObj) return false;
      
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

  const groupedEntries = useMemo(() => {
    const groups = {};
    filteredEntries.forEach(entry => {
      const d = safeDate(entry.ts);
      if (!d) return;
      
      const dayKey = fmtDMY(entry.ts);
      const monthKey = `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
      
      if (!groups[monthKey]) groups[monthKey] = {};
      if (!groups[monthKey][dayKey]) groups[monthKey][dayKey] = [];
      groups[monthKey][dayKey].push(entry);
    });
    
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

  const flatEntries = useMemo(() => {
    const result = [];
    let lastMonth = null;
    
    groupedEntries.forEach(group => {
      const monthDate = parseDayKey(group.date);
      const monthLabel = monthDate && !isNaN(monthDate.getTime()) 
        ? monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' }) 
        : 'Неизвестный месяц';
      
      group.entries.forEach((entry, idx) => {
        const isFirstInDay = idx === 0;
        const dayObj = safeDate(entry.ts);
        const dayLabel = isFirstInDay && dayObj 
          ? dayObj.toLocaleDateString('ru-RU', { 
              weekday: 'long', 
              day: 'numeric' 
            }) 
          : null;
        
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
        return (
          <div className="text-xs text-mut mt-1">
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
      const d = safeDate(e.ts);
      const date = d ? fmtDMY(e.ts) : 'неизвестно';
      const time = d ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
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
      <div className="rep-panel p-4">
        <div className="rep-panel-title">Фильтры журнала</div>
        <div className="toolbar flex flex-wrap gap-2 items-center">
          <label className="lbl m-0">С даты:</label>
          <input
            className="inp w-150"
            type="date"
            value={filters.dateFrom}
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
          />
          <span>—</span>
          <input
            className="inp w-150"
            type="date"
            value={filters.dateTo}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
          />

          <label className="lbl m-0">Пользователь:</label>
          <select
            className="inp sel w-180"
            value={filters.userId}
            onChange={e => handleFilterChange('userId', e.target.value)}
          >
            <option value="all">Все</option>
            {userOptions.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <label className="lbl m-0">Действие:</label>
          <select
            className="inp sel w-200"
            value={filters.action}
            onChange={e => handleFilterChange('action', e.target.value)}
          >
            {ACTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>

          <div className="search-box flex-1 min-w-200">
            <Ic d={ICONS.search} size={15} />
            <input
              placeholder="Поиск по действию или деталям..."
              value={filters.search}
              onChange={e => handleFilterChange('search', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rep-panel p-4">
        <div className="rep-panel-title flex justify-between items-center">
          <span>
            Всего записей: {filteredEntries.length}
            <span className="mut sm font-normal ml-3">
              (показано {paginatedFlat.length})
            </span>
          </span>
          <button className="btn primary sm" onClick={exportToCSV}>
            Выгрузить CSV
          </button>
        </div>
        
        <div className="mt-3">
          {paginatedFlat.length === 0 ? (
            <div className="mut text-center p-5">
              <div className="text-center" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📋</div>
              <div className="text-sm font-semibold mb-1">Записей не найдено</div>
              <div className="mut sm">Измените параметры фильтра или выберите другой период</div>
            </div>
          ) : (
            <table className="tbl" style={{ fontSize: '13px' }}>
              <thead>
                <tr>
                  <th className="w-160 text-mut text-xs uppercase tracking-wider">Дата и время</th>
                  <th className="w-180 text-mut text-xs uppercase tracking-wider">Пользователь</th>
                  <th className="text-mut text-xs uppercase tracking-wider">Действие</th>
                  <th className="text-mut text-xs uppercase tracking-wider">Детали</th>
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
                          <td colSpan="4" className="p-2 border-t" style={{ background: 'linear-gradient(90deg, #f8fafc, transparent)' }}>
                            <div className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                              {entry._monthLabel}
                            </div>
                          </td>
                        </tr>
                      )}
                      {showDay && (
                        <tr>
                          <td colSpan="4" className="p-1 border-t border-dashed">
                            <div className="text-xs font-bold text-acc uppercase tracking-wider">
                              {entry._dayLabel}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr className={showDay ? 'bg-blue-50' : ''} onMouseEnter={(e) => e.currentTarget.style.background = showDay ? '#f0f7ff' : '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.background = showDay ? '#fafbff' : 'transparent'}>
                        <td className="whitespace-nowrap text-xs text-mut font-mono">
                          {safeDate(entry.ts) ? fmtDT(entry.ts) : '—'}
                        </td>
                        <td>
                          <div className="flex items-center gap-2 font-semibold text-sm">
                            <div className="avatar xs" style={{ background: entry.userId === 'system' ? 'linear-gradient(135deg, #64748b, #475569)' : 'linear-gradient(135deg, #1e3a8a, #0ea5e9)', width: 24, height: 24, fontSize: 9 }}>
                              {entry.userId === 'system' ? 'S' : (empName(entry.userId) || entry.userId).charAt(0).toUpperCase()}
                            </div>
                            {entry.userId === 'system' ? 'Система' : empName(entry.userId) || entry.userId}
                          </div>
                        </td>
                        <td>
                          <div className="font-semibold text-sm text-slate-800">
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
          <div className="flex justify-center items-center gap-3 mt-5 pt-4 border-t">
            <button
              className="btn ghost sm"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              style={{ minWidth: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ←
            </button>
            <span className="text-sm text-mut font-medium">
              Страница <b className="text-txt">{page}</b> из <b className="text-txt">{totalPages}</b>
            </span>
            <button
              className="btn ghost sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              style={{ minWidth: '36px', height: '36px', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}