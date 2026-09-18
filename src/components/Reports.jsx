// src/components/Reports.jsx
import { useState, useMemo } from 'react';
import { TASK_STATUSES, PRIORITIES, PROJECT_STATUSES } from '../utils/constants';
import { fmtDMY } from '../utils/date';
import { computeScope, taskVisible } from '../utils/permissions';
import { useToast } from '../context/ToastContext';
import { Ic, ICONS } from './Icons';
import { useDataHelpers, useFilters } from '../hooks';
import { getPrimaryDeptName } from '../utils/helpers';
import { Select } from './Select';
import { optionsFromMap, optionsFromList } from '../utils/selectOptions';

const REPORT_TYPES = [
  { value: 'tasks', label: 'Задачи' },
  { value: 'projects', label: 'Проекты' },
  { value: 'employees', label: 'Сотрудники' },
  { value: 'worklog', label: 'Трудозатраты' },
];

const INITIAL_FILTERS = Object.freeze({
  type: 'tasks',
  dateFrom: '',
  dateTo: '',
  deadlineFrom: '',
  deadlineTo: '',
  projectId: 'all',
  assigneeId: 'all',
  status: 'all',
  priority: 'all',
  customer: '',
});

const SAVED_FILTERS_KEY = 'savedReportFilters';

const EMPTY_STATS = { plan: 0, fact: 0, count: 0 };

// Константные опции - один раз на модуль.
const STATUS_SELECT_OPTIONS = optionsFromMap(TASK_STATUSES, 'Все');
const PRIORITY_SELECT_OPTIONS = optionsFromMap(PRIORITIES, 'Все');

export default function Reports({ db, ur }) {
  const { showToast } = useToast();
  const { empName, getTaskSpent } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  const safeDb = useMemo(() => {
    if (!db) return { projects: [], tasks: [], employees: [], departments: [], kbs: [], vacations: [] };
    return db;
  }, [db]);

  const { filters, setFilter, resetFilters } = useFilters(INITIAL_FILTERS);
  const {
    type: filterType, dateFrom, dateTo, deadlineFrom, deadlineTo,
    projectId, assigneeId, status, priority, customer,
  } = filters;

  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const data = localStorage.getItem(SAVED_FILTERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [filterName, setFilterName] = useState('');

  const allProjects = safeDb.projects || [];
  const allEmployees = safeDb.employees || [];

  const projectsById = useMemo(
    () => new Map(allProjects.map(p => [p.id, p])),
    [allProjects],
  );
  const employeesById = useMemo(
    () => new Map(allEmployees.map(e => [e.id, e])),
    [allEmployees],
  );

  const projectStatsById = useMemo(() => {
    const map = new Map();
    const tasksList = safeDb.tasks || [];
    tasksList.forEach(t => {
      if (t.archived) return;
      let s = map.get(t.projectId);
      if (!s) { s = { plan: 0, fact: 0, count: 0 }; map.set(t.projectId, s); }
      s.plan += t.plannedHours || 0;
      if (Array.isArray(t.logs)) {
        for (const l of t.logs) s.fact += l.hours || 0;
      }
      s.count += 1;
    });
    return map;
  }, [safeDb.tasks]);

  const employeeStatsById = useMemo(() => {
    const map = new Map();
    const tasksList = safeDb.tasks || [];
    tasksList.forEach(t => {
      if (!t.assigneeId) return;
      let s = map.get(t.assigneeId);
      if (!s) { s = { plan: 0, fact: 0, count: 0 }; map.set(t.assigneeId, s); }
      s.plan += t.plannedHours || 0;
      if (Array.isArray(t.logs)) {
        for (const l of t.logs) s.fact += l.hours || 0;
      }
      s.count += 1;
    });
    return map;
  }, [safeDb.tasks]);

  const visibleProjects = useMemo(() => {
    if (scope.all) return allProjects;
    return allProjects.filter(p => scope.projIds.has(p.id));
  }, [allProjects, scope]);

  const visibleEmployees = useMemo(() => {
    if (scope.all) return allEmployees;
    return allEmployees.filter(e => scope.empIds.has(e.id));
  }, [allEmployees, scope]);

  const projectSelectOptions = useMemo(
    () => optionsFromList(
      visibleProjects, 'Все проекты',
      p => ({ value: p.id, label: `${p.code} - ${p.name}` }),
    ),
    [visibleProjects],
  );

  const assigneeSelectOptions = useMemo(
    () => optionsFromList(
      visibleEmployees, 'Все',
      e => ({ value: e.id, label: `${e.last} ${e.first}` }),
    ),
    [visibleEmployees],
  );

  const handleFilterChange = setFilter;

  const results = useMemo(() => {
    const tasksList = safeDb.tasks || [];
    const projectsList = safeDb.projects || [];
    const employeesList = safeDb.employees || [];

    if (filterType === 'tasks') {
      let tasks = tasksList;
      if (dateFrom || dateTo) {
        tasks = tasks.filter(t => {
          if (!t.createdAt) return false;
          if (dateFrom && t.createdAt < dateFrom) return false;
          if (dateTo && t.createdAt > dateTo) return false;
          return true;
        });
      }
      if (deadlineFrom || deadlineTo) {
        tasks = tasks.filter(t => {
          if (!t.deadline) return false;
          if (deadlineFrom && t.deadline < deadlineFrom) return false;
          if (deadlineTo && t.deadline > deadlineTo) return false;
          return true;
        });
      }
      if (projectId !== 'all') tasks = tasks.filter(t => t.projectId === projectId);
      if (assigneeId !== 'all') tasks = tasks.filter(t => t.assigneeId === assigneeId);
      if (status !== 'all') tasks = tasks.filter(t => t.status === status);
      if (priority !== 'all') tasks = tasks.filter(t => t.priority === priority);
      if (customer) {
        const q = customer.toLowerCase();
        tasks = tasks.filter(t => {
          const project = projectsById.get(t.projectId);
          return project && project.customer?.toLowerCase().includes(q);
        });
      }
      tasks = tasks.filter(t => taskVisible(ur, scope, t, safeDb));
      return tasks;
    }

    if (filterType === 'projects') {
      let projects = projectsList;
      if (dateFrom) projects = projects.filter(p => p.start >= dateFrom);
      if (dateTo) projects = projects.filter(p => p.start <= dateTo);
      if (deadlineFrom) projects = projects.filter(p => p.end && p.end >= deadlineFrom);
      if (deadlineTo) projects = projects.filter(p => p.end && p.end <= deadlineTo);
      if (projectId !== 'all') projects = projects.filter(p => p.id === projectId);
      if (customer) {
        const q = customer.toLowerCase();
        projects = projects.filter(p => p.customer?.toLowerCase().includes(q));
      }
      if (!scope.all) projects = projects.filter(p => scope.projIds.has(p.id));
      return projects;
    }

    if (filterType === 'employees') {
      let employees = employeesList;
      if (projectId !== 'all') {
        const taskIds = tasksList.filter(t => t.projectId === projectId).map(t => t.id);
        employees = employees.filter(e =>
          tasksList.some(t => t.assigneeId === e.id && taskIds.includes(t.id))
        );
      }
      if (assigneeId !== 'all') employees = employees.filter(e => e.id === assigneeId);
      if (customer) {
        const q = customer.toLowerCase();
        employees = employees.filter(e => {
          const userTasks = tasksList.filter(t => t.assigneeId === e.id);
          if (userTasks.length === 0) return false;
          return userTasks.some(t => {
            const project = projectsById.get(t.projectId);
            return project && project.customer?.toLowerCase().includes(q);
          });
        });
      }
      return employees;
    }

    if (filterType === 'worklog') {
      let logs = [];
      tasksList.forEach(t => {
        (t.logs || []).forEach(l => {
          logs.push({
            ...l,
            taskTitle: t.title,
            projectId: t.projectId,
            assigneeId: t.assigneeId,
          });
        });
      });
      if (dateFrom) logs = logs.filter(l => l.date >= dateFrom);
      if (dateTo) logs = logs.filter(l => l.date <= dateTo);
      if (projectId !== 'all') logs = logs.filter(l => l.projectId === projectId);
      if (assigneeId !== 'all') logs = logs.filter(l => l.userId === assigneeId);
      if (customer) {
        const q = customer.toLowerCase();
        logs = logs.filter(l => {
          const project = projectsById.get(l.projectId);
          return project && project.customer?.toLowerCase().includes(q);
        });
      }
      if (!scope.all) {
        const visibleTaskIds = tasksList
          .filter(t => taskVisible(ur, scope, t, safeDb))
          .map(t => t.id);
        const visibleSet = new Set(visibleTaskIds);
        logs = logs.filter(l => visibleSet.has(l.taskId));
      }
      return logs;
    }

    return [];
  }, [
    filterType, dateFrom, dateTo, deadlineFrom, deadlineTo,
    projectId, assigneeId, status, priority, customer,
    safeDb, ur, scope, projectsById,
  ]);

  const saveFilter = () => {
    if (!filterName.trim()) {
      showToast('Введите название фильтра', 'warning');
      return;
    }
    const newFilter = {
      id: Date.now(),
      name: filterName.trim(),
      filters: { ...filters },
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    setFilterName('');
    showToast('Фильтр сохранён', 'success');
  };

  const loadFilter = (filter) => {
    Object.entries(filter.filters).forEach(([key, value]) => setFilter(key, value));
    setFilterName(filter.name);
  };

  const deleteSavedFilter = (id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
  };

  const downloadXLSX = () => {
    if (results.length === 0) {
      showToast('Нет данных для выгрузки', 'warning');
      return;
    }
    showToast('Выгрузка XLSX пока не реализована', 'info');
  };

  const renderResults = () => {
    if (results.length === 0) {
      return <div className="empty-note p-4">Нет данных, соответствующих фильтрам</div>;
    }

    if (filterType === 'tasks') {
      return (
        <div className="w-full overflow-x-auto">
          <table className="tbl" style={{ minWidth: '800px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th><th>Задача</th><th>Проект</th><th>Исполнитель</th>
                <th>Статус</th><th>Приоритет</th><th>План (ч)</th><th>Факт (ч)</th><th>Срок исполнения</th>
              </tr>
            </thead>
            <tbody>
              {results.map((t, idx) => {
                const project = projectsById.get(t.projectId);
                const statusDef = TASK_STATUSES[t.status] || { label: t.status || 'Неизвестно', color: '#64748b' };
                const priorityDef = PRIORITIES[t.priority] || { label: t.priority || 'Неизвестно', color: '#64748b' };
                return (
                  <tr key={t.id}>
                    <td>{idx + 1}</td>
                    <td><b>{t.title}</b></td>
                    <td>{project?.code || '-'}</td>
                    <td>{t.assigneeId ? empName(t.assigneeId) : '-'}</td>
                    <td><span className="st-chip" style={{ background: statusDef.color + '22', color: statusDef.color }}>{statusDef.label}</span></td>
                    <td><span style={{ color: priorityDef.color }}>{priorityDef.label}</span></td>
                    <td>{t.plannedHours ?? '-'}</td>
                    <td>{getTaskSpent(t)}</td>
                    <td>{t.deadline ? fmtDMY(t.deadline) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (filterType === 'projects') {
      return (
        <div className="w-full overflow-x-auto">
          <table className="tbl" style={{ minWidth: '600px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th><th>Код</th><th>Проект</th><th>Статус</th><th>Заказчик</th>
                <th>Бюджет (ч)</th><th>План (ч)</th><th>Факт (ч)</th><th>Ответственный</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p, idx) => {
                const stats = projectStatsById.get(p.id) || EMPTY_STATS;
                return (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td><b>{p.code}</b></td>
                    <td>{p.name}</td>
                    <td><span className={`st-chip ${p.status === 'active' ? 'active' : ''}`}>{PROJECT_STATUSES[p.status] || p.status}</span></td>
                    <td>{p.customer || '-'}</td>
                    <td>{p.budget ?? '-'}</td>
                    <td>{stats.plan}</td>
                    <td>{stats.fact}</td>
                    <td>{empName(p.managerId)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (filterType === 'employees') {
      return (
        <div className="w-full overflow-x-auto">
          <table className="tbl" style={{ minWidth: '600px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th><th>Сотрудник</th><th>Отдел (основной)</th>
                <th>План (ч)</th><th>Факт (ч)</th><th>Кол-во задач</th>
              </tr>
            </thead>
            <tbody>
              {results.map((e, idx) => {
                const deptName = getPrimaryDeptName(e, safeDb);
                const stats = employeeStatsById.get(e.id) || EMPTY_STATS;
                return (
                  <tr key={e.id}>
                    <td>{idx + 1}</td>
                    <td><b>{e.last} {e.first}</b></td>
                    <td>{deptName}</td>
                    <td>{stats.plan}</td>
                    <td>{stats.fact}</td>
                    <td>{stats.count}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    if (filterType === 'worklog') {
      return (
        <div className="w-full overflow-x-auto">
          <table className="tbl" style={{ minWidth: '700px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th><th>Дата</th><th>Сотрудник</th><th>Задача</th>
                <th>Проект</th><th>Часы</th><th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {results.map((l, idx) => {
                const project = projectsById.get(l.projectId);
                const user = employeesById.get(l.userId);
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{fmtDMY(l.date)}</td>
                    <td>{user ? `${user.last} ${user.first}` : '-'}</td>
                    <td>{l.taskTitle}</td>
                    <td>{project?.code || '-'}</td>
                    <td><b>{l.hours}</b></td>
                    <td>{l.note || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  };

  const showDateRange = filterType !== 'employees';
  const showDeadlineRange = filterType === 'tasks' || filterType === 'projects';
  const showStatusPriority = filterType === 'tasks';

  return (
    <div className="rep">
      <div className="rep-panel p-4">
        <div className="rep-panel-title">Фильтры отчёта</div>

        <div className="toolbar mb-2">
          <label className="lbl m-0">Тип отчёта:</label>
          <div className="seg">
            {REPORT_TYPES.map(typeOption => (
              <button
                key={typeOption.value}
                className={`seg-btn${filterType === typeOption.value ? ' on' : ''}`}
                onClick={() => handleFilterChange('type', typeOption.value)}
              >
                {typeOption.label}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar filters-row">
          {showDateRange && (
            <div className="filter-group">
              <label className="lbl m-0">
                {filterType === 'worklog'
                  ? 'Дата записи:'
                  : filterType === 'projects'
                    ? 'Начало:'
                    : 'ДАТА СОЗДАНИЯ:'}
              </label>
              <input className="inp w-150" type="date" value={dateFrom}
                onChange={e => handleFilterChange('dateFrom', e.target.value)} />
              <span className="filter-group-sep">-</span>
              <input className="inp w-150" type="date" value={dateTo}
                onChange={e => handleFilterChange('dateTo', e.target.value)} />
            </div>
          )}

          {showDeadlineRange && (
            <div className="filter-group">
              <label className="lbl m-0">
                {filterType === 'projects' ? 'Окончание:' : 'Срок исполнения:'}
              </label>
              <input className="inp w-150" type="date" value={deadlineFrom}
                onChange={e => handleFilterChange('deadlineFrom', e.target.value)} />
              <span className="filter-group-sep">-</span>
              <input className="inp w-150" type="date" value={deadlineTo}
                onChange={e => handleFilterChange('deadlineTo', e.target.value)} />
            </div>
          )}

          <div className="filter-group">
            <label className="lbl m-0">Проект:</label>
            <Select
              className="w-180"
              value={projectId}
              onChange={v => handleFilterChange('projectId', v)}
              options={projectSelectOptions}
            />
          </div>

          <div className="filter-group">
            <label className="lbl m-0">Исполнитель:</label>
            <Select
              className="w-180"
              value={assigneeId}
              onChange={v => handleFilterChange('assigneeId', v)}
              options={assigneeSelectOptions}
            />
          </div>

          <div className="filter-group">
            <label className="lbl m-0">Заказчик:</label>
            <input
              className="inp w-200"
              type="text"
              value={customer}
              onChange={e => handleFilterChange('customer', e.target.value)}
              placeholder="поиск по названию"
            />
          </div>

          {showStatusPriority && (
            <>
              <div className="filter-group">
                <label className="lbl m-0">Статус задачи:</label>
                <Select
                  className="w-140"
                  value={status}
                  onChange={v => handleFilterChange('status', v)}
                  options={STATUS_SELECT_OPTIONS}
                />
              </div>

              <div className="filter-group">
                <label className="lbl m-0">Приоритет:</label>
                <Select
                  className="w-140"
                  value={priority}
                  onChange={v => handleFilterChange('priority', v)}
                  options={PRIORITY_SELECT_OPTIONS}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-3 flex gap-3 flex-wrap">
          <button className="btn ghost" onClick={resetFilters}>Сбросить фильтры</button>
          <div className="flex gap-2 items-center">
            <input className="inp w-180" type="text" value={filterName}
              onChange={e => setFilterName(e.target.value)} placeholder="Название шаблона" />
            <button className="btn ghost" onClick={saveFilter}>
              <Ic d={ICONS.plus} size={13} /> Сохранить фильтр
            </button>
          </div>
        </div>
      </div>

      {savedFilters.length > 0 && (
        <div className="rep-panel p-4">
          <div className="rep-panel-title">Сохранённые шаблоны</div>
          <div className="flex flex-wrap gap-3">
            {savedFilters.map(f => {
              const criteria = [];
              const typeLabel = REPORT_TYPES.find(t => t.value === f.filters.type)?.label || 'Задачи';
              criteria.push(`Тип: ${typeLabel}`);
              if (f.filters.dateFrom || f.filters.dateTo) {
                const from = f.filters.dateFrom ? fmtDMY(f.filters.dateFrom) : '';
                const to = f.filters.dateTo ? fmtDMY(f.filters.dateTo) : '';
                criteria.push(`Период: ${from} - ${to}`);
              }
              if (f.filters.deadlineFrom || f.filters.deadlineTo) {
                const from = f.filters.deadlineFrom ? fmtDMY(f.filters.deadlineFrom) : '';
                const to = f.filters.deadlineTo ? fmtDMY(f.filters.deadlineTo) : '';
                criteria.push(`Срок исполнения: ${from} - ${to}`);
              }
              if (f.filters.projectId !== 'all') {
                const proj = projectsById.get(f.filters.projectId);
                criteria.push(`Проект: ${proj?.code || '-'}`);
              }
              if (f.filters.assigneeId !== 'all') {
                const emp = employeesById.get(f.filters.assigneeId);
                criteria.push(`Исполнитель: ${emp ? emp.last : '-'}`);
              }
              if (f.filters.status !== 'all') criteria.push(`Статус: ${TASK_STATUSES[f.filters.status]?.label || f.filters.status}`);
              if (f.filters.priority !== 'all') criteria.push(`Приоритет: ${PRIORITIES[f.filters.priority]?.label || f.filters.priority}`);
              if (f.filters.customer) criteria.push(`Заказчик: ${f.filters.customer}`);
              const displayText = criteria.length ? criteria.join(' · ') : 'Все';

              return (
                <div key={f.id} className="pj-card cursor-pointer p-3 relative"
                  style={{ minWidth: '200px', maxWidth: '280px' }}>
                  <div className="font-bold text-sm mb-1">{f.name}</div>
                  <div className="text-xs text-mut leading-tight">{displayText}</div>
                  <button className="icon-btn absolute top-1 right-1"
                    onClick={(e) => { e.stopPropagation(); deleteSavedFilter(f.id); }}
                    title="Удалить шаблон">
                    <Ic d={ICONS.x} size={14} />
                  </button>
                  <div className="mt-2">
                    <button className="btn ghost sm" onClick={() => loadFilter(f)}>Загрузить</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rep-panel p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="rep-panel-title m-0">Результаты ({results.length})</div>
          <button className="btn primary sm" onClick={downloadXLSX} disabled={results.length === 0}>
            <Ic d={ICONS.download} size={13} /> Выгрузить XLSX
          </button>
        </div>
        {renderResults()}
      </div>
    </div>
  );
}