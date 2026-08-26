import React, { useState, useMemo } from 'react';
import Kanban from '../Kanban';
import TasksList from './TasksList';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES } from '../../utils/constants';
import { fmtDMY, daysDiff, TODAY, isTaskActive } from '../../utils/date';
import { taskVisible, computeScope, hasRole, canChangeTaskStatus } from '../../utils/permissions';
import { useToast } from '../../context/ToastContext';
import { ICONS, Ic } from '../Icons';
import { useDataHelpers } from '../../hooks';
import Avatar from '../Avatar';
import { getProjectColor } from '../../utils/projectHelpers';

export default function TasksView({ db, ur, openTask, store }) {
  const { showToast } = useToast();
  const { getTaskSpent } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const canSeeAll = hasRole(ur, 'admin', 'director', 'economist', 'kb_chief', 'head', 'project_lead', 'project_manager');

  const [viewMode, setViewMode] = useState('kanban');
  const [fProj, setFProj] = useState('all');
  const [fExec, setFExec] = useState('all');
  const [fPrio, setFPrio] = useState('all');
  const [fDept, setFDept] = useState('all');
  const [q, setQ] = useState('');
  const [showOnlyMy, setShowOnlyMy] = useState(false);

  const filteredTasks = useMemo(() => {
    let list = db.tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db));
    if (fProj !== 'all') list = list.filter(t => t.projectId === fProj);
    if (fExec !== 'all') list = list.filter(t => (t.assigneeIds || []).includes(fExec));
    if (fPrio !== 'all') list = list.filter(t => t.priority === fPrio);
    if (fDept !== 'all') {
      list = list.filter(t => {
        const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
        return assignees.some(a => a.departments.some(d => d.deptId === fDept));
      });
    }
    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(t =>
        t.title.toLowerCase().includes(s) ||
        (db.projects.find(p => p.id === t.projectId)?.name || '').toLowerCase().includes(s)
      );
    }
    if (showOnlyMy) list = list.filter(t => (t.assigneeIds || []).includes(ur.id));
    return list;
  }, [db, ur, scope, fProj, fExec, fPrio, fDept, q, showOnlyMy]);

  const projOptions = useMemo(() => {
    const ids = new Set(filteredTasks.map(t => t.projectId).filter(Boolean));
    return db.projects.filter(p => ids.has(p.id) && !p.archived);
  }, [filteredTasks, db.projects]);

  const execOptions = useMemo(() => {
    const ids = new Set(filteredTasks.flatMap(t => t.assigneeIds || []));
    return db.employees.filter(e => ids.has(e.id));
  }, [filteredTasks, db.employees]);

  const isOnlyExecutor = ur.roles.length === 1 && ur.roles[0] === 'executor';

  const renderTaskCard = (task) => {
    const p = db.projects.find(x => x.id === task.projectId);
    const assignees = (task.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
    const sp = getTaskSpent(task);
    const overdue = task.deadline && !['closed','cancelled'].includes(task.status) && task.deadline < TODAY;
    const soon = task.deadline && !overdue && !['closed','cancelled'].includes(task.status) && daysDiff(TODAY, task.deadline) <= 3;
    const priority = PRIORITIES[task.priority] || { label: task.priority || 'Нет', color: '#64748b' };
    return (
      <div onClick={() => openTask(task.id)}>
        <div className="kcard-prio" style={{ background: priority.color }} />
        <div className="kcard-title">{task.title}</div>
        <div className="kcard-proj">
          <span className="pdot" style={{ background: getProjectColor(p) }} />
          {p?.code}
        </div>
        <div className="kcard-meta">
          {assignees.length > 0 && (
            <span className="kassignee">
              {assignees.slice(0,2).map(a => (
                <Avatar key={a.id} employee={a} size="xs" />
              ))}
              {assignees.length > 2 && <span className="mut sm">+{assignees.length-2}</span>}
            </span>
          )}
          <span className="khours"><Ic d={ICONS.clock} size={13} /> {sp}/{task.plannedHours ?? '—'} ч</span>
          <span className="prio-chip" style={{ color: priority.color, fontWeight: 700, fontSize: '12px' }}>
            {priority.label}
          </span>
        </div>
        <div className="kcard-foot">
          <span className={'kdl' + (overdue ? ' late' : soon ? ' soon' : '')}>
            {task.deadline ? (overdue ? `просрочено ${-daysDiff(TODAY, task.deadline)} дн` : `до ${fmtDMY(task.deadline)}`) : 'без дедлайна'}
          </span>
        </div>
      </div>
    );
  };

  const handleMoveTask = (taskId, newStatus) => {
    const task = db.tasks.find(t => t.id === taskId);
    if (!task) return;
    if (!canChangeTaskStatus(ur, task, newStatus, db)) {
      showToast('У вас нет прав на изменение статуса этой задачи.', 'error');
      return;
    }
    const isClosing = (newStatus === 'closed' || newStatus === 'cancelled') && task.status !== newStatus;
    const updatedTask = {
      ...task,
      status: newStatus,
      closedAt: isClosing ? TODAY : task.closedAt,
      archived: isClosing ? true : task.archived,
      archivedAt: isClosing ? TODAY : task.archivedAt,
      history: [...task.history, { ts: Date.now(), who: ur.id, text: `Статус → ${TASK_STATUSES[newStatus].label}` }]
    };
    store.upsertTask(updatedTask);
  };

  return (
    <>
      <div className="toolbar">
        <div className="btn-group">
          <button className={`btn ghost sm ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
            <Ic d={ICONS.list} size={15} /> Список
          </button>
          <button className={`btn ghost sm ${viewMode === 'kanban' ? 'active' : ''}`} onClick={() => setViewMode('kanban')}>
            <Ic d={ICONS.kanban} size={15} /> Канбан
          </button>
        </div>

        <input
          className="inp sm filter-search"
          placeholder="Поиск..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        <select className="inp sel sm filter-select" value={fProj} onChange={e => setFProj(e.target.value)}>
          <option value="all">Проект</option>
          {projOptions.map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
        </select>

        {!isOnlyExecutor && (
          <select className="inp sel sm filter-select" value={fExec} onChange={e => setFExec(e.target.value)}>
            <option value="all">Исполнитель</option>
            {execOptions.map(e => <option key={e.id} value={e.id}>{e.last}</option>)}
          </select>
        )}

        <select className="inp sel sm filter-select" value={fPrio} onChange={e => setFPrio(e.target.value)}>
          <option value="all">Приоритет</option>
          {Object.entries(PRIORITIES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {!isOnlyExecutor && (
          <select className="inp sel sm filter-select" value={fDept} onChange={e => setFDept(e.target.value)}>
            <option value="all">Отдел</option>
            {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}

        {canSeeAll && (
          <label className="dept-pick" style={{ marginLeft: 'auto' }}>
            <input type="checkbox" checked={showOnlyMy} onChange={e => setShowOnlyMy(e.target.checked)} />
            <span>Мои задачи</span>
          </label>
        )}

        <button className="btn primary" onClick={() => openTask(null)}>
          <Ic d={ICONS.plus} size={15} /> Создать
        </button>
      </div>

      {viewMode === 'kanban' ? (
        <Kanban
          items={filteredTasks}
          statusOrder={TASK_STATUS_ORDER}
          statusMap={TASK_STATUSES}
          renderCard={renderTaskCard}
          onDrop={handleMoveTask}
        />
      ) : (
        <TasksList tasks={filteredTasks} db={db} openTask={openTask} />
      )}
    </>
  );
}