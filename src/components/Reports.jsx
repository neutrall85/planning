import React, { useState, useMemo, useEffect } from 'react';
import { TASK_STATUSES, PRIORITIES, PROJECT_STATUSES, PROJECT_TYPES } from '../utils/constants';
import { TODAY, fmtDMY, fmtDT } from '../utils/date';
import { hasRole, computeScope, taskVisible } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import { useDataHelpers } from '../hooks';
import { useToast } from './Toast';

const AIRCRAFT_TYPES = ['Все', 'Су-57', 'МиГ-35', 'Ту-160', 'Ил-76', 'Ка-52', 'Другой'];
const PROJECT_TYPE_OPTIONS = ['Все', 'Ремонт', 'Модификация'];
const STAGES = ['Все', 'Эскизный проект', 'Рабочая документация', 'Изготовление', 'Испытания', 'Сдача'];

const REPORT_TYPES = [
  { value: 'tasks', label: 'Задачи' },
  { value: 'projects', label: 'Проекты' },
  { value: 'employees', label: 'Сотрудники' },
  { value: 'worklog', label: 'Трудозатраты' },
];

export default function Reports({ db, ur }) {
  const { empName, getTaskSpent, getProjectStats } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  // Защита от отсутствия данных
  const safeDb = useMemo(() => {
    if (!db) return { projects: [], tasks: [], employees: [], departments: [], kbs: [], vacations: [] };
    return db;
  }, [db]);

  const [filters, setFilters] = useState({
    type: 'tasks',
    dateFrom: '',
    dateTo: '',
    deadlineFrom: '',
    deadlineTo: '',
    projectId: 'all',
    assigneeId: 'all',
    status: 'all',
    priority: 'all',
    aircraftType: 'all',
    projectType: 'all',
    stage: 'all',
    customer: '',
  });

  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const data = localStorage.getItem('savedReportFilters');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  });

  const [filterName, setFilterName] = useState('');
  const [results, setResults] = useState([]);

  const allProjects = (safeDb.projects || []);
  const visibleProjects = useMemo(() => {
    if (scope.all) return allProjects;
    return allProjects.filter(p => scope.projIds.has(p.id));
  }, [allProjects, scope]);

  const allEmployees = (safeDb.employees || []);
  const visibleEmployees = useMemo(() => {
    if (scope.all) return allEmployees;
    return allEmployees.filter(e => scope.empIds.has(e.id));
  }, [allEmployees, scope]);

  const applyFilters = () => {
    const type = filters.type;
    const tasksList = safeDb.tasks || [];
    const projectsList = safeDb.projects || [];
    const employeesList = safeDb.employees || [];

    if (type === 'tasks') {
      let tasks = tasksList;
      if (filters.dateFrom || filters.dateTo) {
        tasks = tasks.filter(t => {
          if (!t.createdAt) return false;
          if (filters.dateFrom && t.createdAt < filters.dateFrom) return false;
          if (filters.dateTo && t.createdAt > filters.dateTo) return false;
          return true;
        });
      }
      if (filters.deadlineFrom || filters.deadlineTo) {
        tasks = tasks.filter(t => {
          if (!t.deadline) return false;
          if (filters.deadlineFrom && t.deadline < filters.deadlineFrom) return false;
          if (filters.deadlineTo && t.deadline > filters.deadlineTo) return false;
          return true;
        });
      }
      if (filters.projectId !== 'all') tasks = tasks.filter(t => t.projectId === filters.projectId);
      if (filters.assigneeId !== 'all') tasks = tasks.filter(t => (t.assigneeIds || []).includes(filters.assigneeId));
      if (filters.status !== 'all') tasks = tasks.filter(t => t.status === filters.status);
      if (filters.priority !== 'all') tasks = tasks.filter(t => t.priority === filters.priority);
      tasks = tasks.filter(t => {
        const project = projectsList.find(p => p.id === t.projectId);
        if (!project) return false;
        if (filters.aircraftType !== 'all' && project.aircraftType !== filters.aircraftType) return false;
        if (filters.projectType !== 'all' && project.projectType !== filters.projectType) return false;
        if (filters.stage !== 'all' && project.stage !== filters.stage) return false;
        if (filters.customer && !project.customer?.toLowerCase().includes(filters.customer.toLowerCase())) return false;
        return true;
      });
      tasks = tasks.filter(t => taskVisible(ur, scope, t, safeDb));
      setResults(tasks);
    } else if (type === 'projects') {
      let projects = projectsList;
      if (filters.dateFrom) projects = projects.filter(p => p.start >= filters.dateFrom);
      if (filters.dateTo) projects = projects.filter(p => p.start <= filters.dateTo);
      if (filters.deadlineFrom) projects = projects.filter(p => p.end && p.end >= filters.deadlineFrom);
      if (filters.deadlineTo) projects = projects.filter(p => p.end && p.end <= filters.deadlineTo);
      if (filters.projectId !== 'all') projects = projects.filter(p => p.id === filters.projectId);
      if (filters.aircraftType !== 'all') projects = projects.filter(p => p.aircraftType === filters.aircraftType);
      if (filters.projectType !== 'all') projects = projects.filter(p => p.projectType === filters.projectType);
      if (filters.stage !== 'all') projects = projects.filter(p => p.stage === filters.stage);
      if (filters.customer) projects = projects.filter(p => p.customer?.toLowerCase().includes(filters.customer.toLowerCase()));
      if (!scope.all) projects = projects.filter(p => scope.projIds.has(p.id));
      setResults(projects);
    } else if (type === 'employees') {
      let employees = employeesList;
      if (filters.projectId !== 'all') {
        const taskIds = tasksList.filter(t => t.projectId === filters.projectId).map(t => t.id);
        employees = employees.filter(e =>
          tasksList.some(t => t.assigneeIds?.includes(e.id) && taskIds.includes(t.id))
        );
      }
      if (filters.assigneeId !== 'all') employees = employees.filter(e => e.id === filters.assigneeId);
      // Фильтры по типу ВС, типу проекта, стадии, заказчику применяем через задачи
      if (filters.aircraftType !== 'all' || filters.projectType !== 'all' || filters.stage !== 'all' || filters.customer) {
        employees = employees.filter(e => {
          const userTasks = tasksList.filter(t => t.assigneeIds?.includes(e.id));
          if (userTasks.length === 0) return false;
          // Проверяем, есть ли хотя бы одна задача, соответствующая фильтрам по проекту
          return userTasks.some(t => {
            const project = projectsList.find(p => p.id === t.projectId);
            if (!project) return false;
            if (filters.aircraftType !== 'all' && project.aircraftType !== filters.aircraftType) return false;
            if (filters.projectType !== 'all' && project.projectType !== filters.projectType) return false;
            if (filters.stage !== 'all' && project.stage !== filters.stage) return false;
            if (filters.customer && !project.customer?.toLowerCase().includes(filters.customer.toLowerCase())) return false;
            return true;
          });
        });
      }
      setResults(employees);
    } else if (type === 'worklog') {
      let logs = [];
      tasksList.forEach(t => {
        (t.logs || []).forEach(l => {
          logs.push({
            ...l,
            taskTitle: t.title,
            projectId: t.projectId,
            assigneeIds: t.assigneeIds || [],
          });
        });
      });
      if (filters.dateFrom) logs = logs.filter(l => l.date >= filters.dateFrom);
      if (filters.dateTo) logs = logs.filter(l => l.date <= filters.dateTo);
      if (filters.projectId !== 'all') logs = logs.filter(l => l.projectId === filters.projectId);
      if (filters.assigneeId !== 'all') logs = logs.filter(l => l.userId === filters.assigneeId);
      if (filters.aircraftType !== 'all' || filters.projectType !== 'all' || filters.stage !== 'all' || filters.customer) {
        logs = logs.filter(l => {
          const project = projectsList.find(p => p.id === l.projectId);
          if (!project) return false;
          if (filters.aircraftType !== 'all' && project.aircraftType !== filters.aircraftType) return false;
          if (filters.projectType !== 'all' && project.projectType !== filters.projectType) return false;
          if (filters.stage !== 'all' && project.stage !== filters.stage) return false;
          if (filters.customer && !project.customer?.toLowerCase().includes(filters.customer.toLowerCase())) return false;
          return true;
        });
      }
      if (!scope.all) {
        const visibleTaskIds = tasksList
          .filter(t => taskVisible(ur, scope, t, safeDb))
          .map(t => t.id);
        logs = logs.filter(l => {
          const task = tasksList.find(t => t.id === l.taskId);
          return task && visibleTaskIds.includes(task.id);
        });
      }
      setResults(logs);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filters, safeDb, ur, scope]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      type: filters.type,
      dateFrom: '',
      dateTo: '',
      deadlineFrom: '',
      deadlineTo: '',
      projectId: 'all',
      assigneeId: 'all',
      status: 'all',
      priority: 'all',
      aircraftType: 'all',
      projectType: 'all',
      stage: 'all',
      customer: '',
    });
  };

  const saveFilter = () => {
    if (!filterName.trim()) {
      alert('Введите название фильтра');
      return;
    }
    const newFilter = {
      id: Date.now(),
      name: filterName.trim(),
      filters: { ...filters },
    };
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem('savedReportFilters', JSON.stringify(updated));
    setFilterName('');
  };

  const loadFilter = (filter) => {
    setFilters(filter.filters);
    setFilterName(filter.name);
  };

  const deleteFilter = (id) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem('savedReportFilters', JSON.stringify(updated));
  };

  const downloadXLSX = () => {
    if (results.length === 0) {
      alert('Нет данных для выгрузки');
      return;
    }
    const type = filters.type;
    let rows = [];
    if (type === 'tasks') {
      rows = [['№', 'Задача', 'Проект', 'Исполнители', 'Статус', 'Приоритет', 'План (ч)', 'Факт (ч)', 'Создано', 'Дедлайн']];
      results.forEach((t, idx) => {
        const project = (safeDb.projects || []).find(p => p.id === t.projectId);
        const statusDef = TASK_STATUSES[t.status] || { label: t.status || 'Неизвестно', color: '#64748b' };
        const priorityDef = PRIORITIES[t.priority] || { label: t.priority || 'Неизвестно', color: '#64748b' };
        rows.push([
          idx + 1, t.title, project?.code || '—',
          (t.assigneeIds || []).map(id => empName(id)).join(', '),
          statusDef.label,
          priorityDef.label,
          t.plannedHours ?? '—',
          getTaskSpent(t),
          fmtDT(t.createdAt),
          t.deadline ? fmtDMY(t.deadline) : '—'
        ]);
      });
    } else if (type === 'projects') {
      rows = [['№', 'Код', 'Проект', 'Статус', 'Заказчик', 'Тип ВС', 'Тип проекта', 'Стадия', 'Бюджет (ч)', 'План (ч)', 'Факт (ч)', 'Ответственный']];
      results.forEach((p, idx) => {
        const stats = getProjectStats(p.id);
        rows.push([
          idx + 1, p.code, p.name, PROJECT_STATUSES[p.status] || p.status,
          p.customer || '—', p.aircraftType || '—', p.projectType || '—', p.stage || '—',
          p.budget ?? '—', stats.plan, stats.fact,
          empName(p.managerId)
        ]);
      });
    } else if (type === 'employees') {
      rows = [['№', 'Сотрудник', 'Отдел (основной)', 'План (ч)', 'Факт (ч)', 'Кол-во задач']];
      results.forEach((e, idx) => {
        const dept = (e.departments || []).find(d => d.primary);
        const deptName = dept ? (safeDb.departments || []).find(d => d.id === dept.deptId)?.name : '—';
        const tasks = (safeDb.tasks || []).filter(t => t.assigneeIds?.includes(e.id));
        const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
        const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
        rows.push([
          idx + 1, `${e.last} ${e.first}`, deptName,
          plan, fact, tasks.length
        ]);
      });
    } else if (type === 'worklog') {
      rows = [['№', 'Дата', 'Сотрудник', 'Задача', 'Проект', 'Часы', 'Комментарий']];
      results.forEach((l, idx) => {
        const project = (safeDb.projects || []).find(p => p.id === l.projectId);
        const user = (safeDb.employees || []).find(e => e.id === l.userId);
        rows.push([
          idx + 1, fmtDMY(l.date),
          user ? `${user.last} ${user.first}` : '—',
          l.taskTitle,
          project?.code || '—',
          l.hours,
          l.note || '—'
        ]);
      });
    }
    alert(`Выгрузка XLSX пока не реализована. Данных: ${results.length} строк`);
  };

  const renderResults = () => {
    const type = filters.type;
    if (results.length === 0) {
      return <div className="empty-note" style={{ padding: '20px 0' }}>Нет данных, соответствующих фильтрам</div>;
    }

    if (type === 'tasks') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '800px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Задача</th>
                <th>Проект</th>
                <th>Исполнители</th>
                <th>Статус</th>
                <th>Приоритет</th>
                <th>План (ч)</th>
                <th>Факт (ч)</th>
                <th>Дедлайн</th>
              </tr>
            </thead>
            <tbody>
              {results.map((t, idx) => {
                const project = (safeDb.projects || []).find(p => p.id === t.projectId);
                const statusDef = TASK_STATUSES[t.status] || { label: t.status || 'Неизвестно', color: '#64748b' };
                const priorityDef = PRIORITIES[t.priority] || { label: t.priority || 'Неизвестно', color: '#64748b' };
                return (
                  <tr key={t.id}>
                    <td>{idx + 1}</td>
                    <td><b>{t.title}</b></td>
                    <td>{project?.code || '—'}</td>
                    <td>{(t.assigneeIds || []).map(id => empName(id)).join(', ') || '—'}</td>
                    <td><span className="st-chip" style={{ background: statusDef.color + '22', color: statusDef.color }}>{statusDef.label}</span></td>
                    <td><span style={{ color: priorityDef.color }}>{priorityDef.label}</span></td>
                    <td>{t.plannedHours ?? '—'}</td>
                    <td>{getTaskSpent(t)}</td>
                    <td>{t.deadline ? fmtDMY(t.deadline) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else if (type === 'projects') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '800px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Код</th>
                <th>Проект</th>
                <th>Статус</th>
                <th>Заказчик</th>
                <th>Тип ВС</th>
                <th>Тип проекта</th>
                <th>Стадия</th>
                <th>Бюджет (ч)</th>
                <th>План (ч)</th>
                <th>Факт (ч)</th>
                <th>Ответственный</th>
              </tr>
            </thead>
            <tbody>
              {results.map((p, idx) => {
                const stats = getProjectStats(p.id);
                return (
                  <tr key={p.id}>
                    <td>{idx + 1}</td>
                    <td><b>{p.code}</b></td>
                    <td>{p.name}</td>
                    <td><span className={`st-chip ${p.status === 'active' ? 'active' : ''}`}>{PROJECT_STATUSES[p.status] || p.status}</span></td>
                    <td>{p.customer || '—'}</td>
                    <td>{p.aircraftType || '—'}</td>
                    <td>{p.projectType || '—'}</td>
                    <td>{p.stage || '—'}</td>
                    <td>{p.budget ?? '—'}</td>
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
    } else if (type === 'employees') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '600px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Сотрудник</th>
                <th>Отдел (основной)</th>
                <th>План (ч)</th>
                <th>Факт (ч)</th>
                <th>Кол-во задач</th>
              </tr>
            </thead>
            <tbody>
              {results.map((e, idx) => {
                const dept = (e.departments || []).find(d => d.primary);
                const deptName = dept ? (safeDb.departments || []).find(d => d.id === dept.deptId)?.name : '—';
                const tasks = (safeDb.tasks || []).filter(t => t.assigneeIds?.includes(e.id));
                const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
                const fact = tasks.reduce((s, t) => s + getTaskSpent(t), 0);
                return (
                  <tr key={e.id}>
                    <td>{idx + 1}</td>
                    <td><b>{e.last} {e.first}</b></td>
                    <td>{deptName}</td>
                    <td>{plan}</td>
                    <td>{fact}</td>
                    <td>{tasks.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    } else if (type === 'worklog') {
      return (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table className="tbl" style={{ minWidth: '700px', fontSize: '13px' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Дата</th>
                <th>Сотрудник</th>
                <th>Задача</th>
                <th>Проект</th>
                <th>Часы</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {results.map((l, idx) => {
                const project = (safeDb.projects || []).find(p => p.id === l.projectId);
                const user = (safeDb.employees || []).find(e => e.id === l.userId);
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>{fmtDMY(l.date)}</td>
                    <td>{user ? `${user.last} ${user.first}` : '—'}</td>
                    <td>{l.taskTitle}</td>
                    <td>{project?.code || '—'}</td>
                    <td><b>{l.hours}</b></td>
                    <td>{l.note || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }
  };

  // Определение, какие фильтры показывать
  const type = filters.type;
  const showTaskSpecific = type === 'tasks';
  const showProjectDates = type === 'projects';
  const showWorklogDates = type === 'worklog';
  const showEmployeeFilters = type === 'employees';
  // Для сотрудников даты не показываем
  const showDateRange = type !== 'employees';
  // Для проектов и задач показываем дедлайн/окончание
  const showDeadlineRange = type === 'tasks' || type === 'projects';
  // Для сотрудников и трудозатрат не показываем статус/приоритет
  const showStatusPriority = type === 'tasks';

  return (
    <div className="rep">
      <div className="rep-panel" style={{ padding: '16px' }}>
        <div className="rep-panel-title">Фильтры отчёта</div>

        <div className="toolbar" style={{ marginBottom: '8px' }}>
          <label className="lbl" style={{ margin: 0 }}>Тип отчёта:</label>
          <div className="seg">
            {REPORT_TYPES.map(typeOption => (
              <button
                key={typeOption.value}
                className={`seg-btn${filters.type === typeOption.value ? ' on' : ''}`}
                onClick={() => handleFilterChange('type', typeOption.value)}
              >
                {typeOption.label}
              </button>
            ))}
          </div>
        </div>

        <div className="toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          {showDateRange && (
            <>
              <label className="lbl" style={{ margin: 0 }}>
                {showWorklogDates ? 'Дата записи:' : showProjectDates ? 'Начало:' : 'Создан с:'}
              </label>
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
            </>
          )}

          {showDeadlineRange && (
            <>
              <label className="lbl" style={{ margin: 0 }}>
                {showProjectDates ? 'Окончание:' : 'Дедлайн:'}
              </label>
              <input
                className="inp"
                type="date"
                value={filters.deadlineFrom}
                onChange={e => handleFilterChange('deadlineFrom', e.target.value)}
                style={{ width: '150px' }}
              />
              <span>—</span>
              <input
                className="inp"
                type="date"
                value={filters.deadlineTo}
                onChange={e => handleFilterChange('deadlineTo', e.target.value)}
                style={{ width: '150px' }}
              />
            </>
          )}

          <label className="lbl" style={{ margin: 0 }}>Проект:</label>
          <select
            className="inp sel"
            value={filters.projectId}
            onChange={e => handleFilterChange('projectId', e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Все проекты</option>
            {visibleProjects.map(p => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Исполнитель:</label>
          <select
            className="inp sel"
            value={filters.assigneeId}
            onChange={e => handleFilterChange('assigneeId', e.target.value)}
            style={{ width: '180px' }}
          >
            <option value="all">Все</option>
            {visibleEmployees.map(e => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
          </select>
        </div>

        <div className="toolbar" style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
          <label className="lbl" style={{ margin: 0 }}>Тип ВС:</label>
          <select
            className="inp sel"
            value={filters.aircraftType}
            onChange={e => handleFilterChange('aircraftType', e.target.value)}
            style={{ width: '140px' }}
          >
            {AIRCRAFT_TYPES.map(t => <option key={t} value={t === 'Все' ? 'all' : t}>{t}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Тип проекта:</label>
          <select
            className="inp sel"
            value={filters.projectType}
            onChange={e => handleFilterChange('projectType', e.target.value)}
            style={{ width: '140px' }}
          >
            {PROJECT_TYPE_OPTIONS.map(t => <option key={t} value={t === 'Все' ? 'all' : t}>{t}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Стадия:</label>
          <select
            className="inp sel"
            value={filters.stage}
            onChange={e => handleFilterChange('stage', e.target.value)}
            style={{ width: '160px' }}
          >
            {STAGES.map(s => <option key={s} value={s === 'Все' ? 'all' : s}>{s}</option>)}
          </select>

          <label className="lbl" style={{ margin: 0 }}>Заказчик:</label>
          <input
            className="inp"
            type="text"
            value={filters.customer}
            onChange={e => handleFilterChange('customer', e.target.value)}
            placeholder="поиск по названию"
            style={{ width: '200px' }}
          />

          {showStatusPriority && (
            <>
              <label className="lbl" style={{ margin: 0 }}>Статус задачи:</label>
              <select
                className="inp sel"
                value={filters.status}
                onChange={e => handleFilterChange('status', e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="all">Все</option>
                {Object.keys(TASK_STATUSES).map(st => <option key={st} value={st}>{TASK_STATUSES[st].label}</option>)}
              </select>

              <label className="lbl" style={{ margin: 0 }}>Приоритет:</label>
              <select
                className="inp sel"
                value={filters.priority}
                onChange={e => handleFilterChange('priority', e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="all">Все</option>
                {Object.keys(PRIORITIES).map(pr => <option key={pr} value={pr}>{PRIORITIES[pr].label}</option>)}
              </select>
            </>
          )}
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn primary" onClick={applyFilters}>Применить</button>
          <button className="btn ghost" onClick={resetFilters}>Сбросить фильтры</button>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              className="inp"
              type="text"
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Название шаблона"
              style={{ width: '180px' }}
            />
            <button className="btn ghost" onClick={saveFilter}>
              <Ic d={ICONS.plus} size={13} /> Сохранить фильтр
            </button>
          </div>
        </div>
      </div>

      {savedFilters.length > 0 && (
        <div className="rep-panel" style={{ padding: '16px' }}>
          <div className="rep-panel-title">Сохранённые шаблоны</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {savedFilters.map(f => {
              const criteria = [];
              const typeLabel = REPORT_TYPES.find(t => t.value === f.filters.type)?.label || 'Задачи';
              criteria.push(`Тип: ${typeLabel}`);
              if (f.filters.dateFrom || f.filters.dateTo) {
                const from = f.filters.dateFrom ? fmtDMY(f.filters.dateFrom) : '';
                const to = f.filters.dateTo ? fmtDMY(f.filters.dateTo) : '';
                criteria.push(`Период: ${from} — ${to}`);
              }
              if (f.filters.deadlineFrom || f.filters.deadlineTo) {
                const from = f.filters.deadlineFrom ? fmtDMY(f.filters.deadlineFrom) : '';
                const to = f.filters.deadlineTo ? fmtDMY(f.filters.deadlineTo) : '';
                criteria.push(`Дедлайн: ${from} — ${to}`);
              }
              if (f.filters.projectId !== 'all') {
                const proj = (safeDb.projects || []).find(p => p.id === f.filters.projectId);
                criteria.push(`Проект: ${proj?.code || '—'}`);
              }
              if (f.filters.assigneeId !== 'all') {
                const emp = (safeDb.employees || []).find(e => e.id === f.filters.assigneeId);
                criteria.push(`Исполнитель: ${emp ? emp.last : '—'}`);
              }
              if (f.filters.status !== 'all') criteria.push(`Статус: ${TASK_STATUSES[f.filters.status]?.label || f.filters.status}`);
              if (f.filters.priority !== 'all') criteria.push(`Приоритет: ${PRIORITIES[f.filters.priority]?.label || f.filters.priority}`);
              if (f.filters.aircraftType !== 'all') criteria.push(`Тип ВС: ${f.filters.aircraftType}`);
              if (f.filters.projectType !== 'all') criteria.push(`Тип проекта: ${f.filters.projectType}`);
              if (f.filters.stage !== 'all') criteria.push(`Стадия: ${f.filters.stage}`);
              if (f.filters.customer) criteria.push(`Заказчик: ${f.filters.customer}`);
              const displayText = criteria.length ? criteria.join(' · ') : 'Все';

              return (
                <div key={f.id} className="pj-card" style={{ minWidth: '200px', maxWidth: '280px', cursor: 'pointer', padding: '12px', position: 'relative' }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>{f.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--mut)', lineHeight: '1.4' }}>{displayText}</div>
                  <button
                    className="icon-btn"
                    style={{ position: 'absolute', top: '6px', right: '6px' }}
                    onClick={(e) => { e.stopPropagation(); deleteFilter(f.id); }}
                    title="Удалить шаблон"
                  >
                    <Ic d={ICONS.x} size={14} />
                  </button>
                  <div style={{ marginTop: '8px' }}>
                    <button className="btn ghost sm" onClick={() => loadFilter(f)}>Загрузить</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rep-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div className="rep-panel-title" style={{ marginBottom: 0 }}>Результаты ({results.length})</div>
          <button className="btn primary sm" onClick={downloadXLSX} disabled={results.length === 0}>
            <Ic d={ICONS.download} size={13} /> Выгрузить XLSX
          </button>
        </div>
        {renderResults()}
      </div>
    </div>
  );
}