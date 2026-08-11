import React, { useState, useMemo } from 'react';
import { Ic, ICONS } from './Icons';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES } from '../utils/constants';
import { TODAY, fmtD, daysDiff, initials, isTaskActive } from '../utils/date';
import { computeScope, taskVisible, canCreateTask, canChangeTaskStatus, hasRole } from '../utils/permissions';
import EmployeeTooltip from './EmployeeTooltip';

export default function Kanban({ db, ur, openTask, onMove, onNew, showOnlyMyTasks: parentShowOnlyMyTasks, sortBy: parentSortBy, hideFilters = false }) {
  const [fProj, setFProj] = useState("all");
  const [fExec, setFExec] = useState("all");
  const [fPrio, setFPrio] = useState("all");
  const [fDept, setFDept] = useState("all");
  const [q, setQ] = useState("");
  const [dragOverCol, setDragOverCol] = useState(null);
  const [localShowOnlyMy, setLocalShowOnlyMy] = useState(false);
  const [localSortBy, setLocalSortBy] = useState("deadline");
  
  // Состояние для tooltip
  const [tooltip, setTooltip] = useState({ visible: false, employee: null, x: 0, y: 0 });
  
  // Используем пропсы от родителя, если переданы, иначе локальное состояние
  const showOnlyMy = parentShowOnlyMyTasks !== undefined ? parentShowOnlyMyTasks : localShowOnlyMy;
  const sortBy = parentSortBy !== undefined ? parentSortBy : localSortBy;

  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  // Определяем, показывать ли чекбокс "Только мои задачи" – только если пользователь видит не только свои задачи
  const canSeeAll = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");

  const visible = useMemo(() => {
    let list = db.tasks.filter((t) => isTaskActive(t) && taskVisible(ur, scope, t, db));
    if (!hideFilters) {
      if (fProj !== "all") list = list.filter(t => t.projectId === fProj);
      if (fExec !== "all") list = list.filter(t => (t.assigneeIds || []).includes(fExec));
      if (fPrio !== "all") list = list.filter(t => t.priority === fPrio);
      if (fDept !== "all") list = list.filter(t => {
        const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
        return assignees.some(a => a.departments.some(d => d.deptId === fDept));
      });
      if (q.trim()) {
        const s = q.trim().toLowerCase();
        list = list.filter(t => t.title.toLowerCase().includes(s) || (db.projects.find(p => p.id === t.projectId)?.name || "").toLowerCase().includes(s));
      }
    }
    // Фильтр "Только мои задачи"
    if (showOnlyMy) {
      list = list.filter(t => (t.assigneeIds || []).includes(ur.id));
    }
    
    // Сортировка
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline) - new Date(b.deadline);
        case 'deadlineDesc':
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(b.deadline) - new Date(a.deadline);
        case 'created':
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'alpha':
          return a.title.localeCompare(b.title, 'ru');
        case 'alphaDesc':
          return b.title.localeCompare(a.title, 'ru');
        case 'hours':
          const aHours = a.plannedHours || 0;
          const bHours = b.plannedHours || 0;
          return aHours - bHours;
        case 'hoursDesc':
          const aH = a.plannedHours || 0;
          const bH = b.plannedHours || 0;
          return bH - aH;
        default:
          return 0;
      }
    });
    
    return list;
  }, [db, ur, scope, fProj, fExec, fPrio, fDept, q, showOnlyMy, sortBy, hideFilters]);

  const isOnlyExecutor = ur.roles.length === 1 && ur.roles[0] === 'executor';

  return (
    <div>
      {!hideFilters && parentShowOnlyMyTasks === undefined && (
        <div className="toolbar">
          <div className="search-box"><Ic d={ICONS.search} size={15} /><input placeholder="Поиск задач…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <select className="inp sel sm" value={fProj} onChange={(e) => setFProj(e.target.value)}>
            <option value="all">Все проекты</option>
            {db.projects.filter(p => !p.archived && (scope.all || scope.projIds.has(p.id))).map(p => <option key={p.id} value={p.id}>{p.code}</option>)}
          </select>
          {!isOnlyExecutor && (
            <select className="inp sel sm" value={fExec} onChange={(e) => setFExec(e.target.value)}>
              <option value="all">Все исполнители</option>
              {[...new Set(visible.flatMap(t => t.assigneeIds || []))].map(id => {
                const e = db.employees.find(x => x.id === id);
                return e ? <option key={id} value={id}>{e.last} {e.first}</option> : null;
              })}
            </select>
          )}
          <select className="inp sel sm" value={fPrio} onChange={(e) => setFPrio(e.target.value)}>
            <option value="all">Любой приоритет</option>
            {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {!isOnlyExecutor && (
            <select className="inp sel sm" value={fDept} onChange={(e) => setFDept(e.target.value)}>
              <option value="all">Все подразделения</option>
              {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          {canSeeAll && (
            <label className="dept-pick" style={{ marginLeft: 8 }}>
              <input type="checkbox" checked={showOnlyMy} onChange={(e) => setLocalShowOnlyMy(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Только мои задачи</span>
            </label>
          )}
          <select className="inp sel sm" value={sortBy} onChange={(e) => setLocalSortBy(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="deadline">По дедлайну (возр.)</option>
            <option value="deadlineDesc">По дедлайну (убыв.)</option>
            <option value="created">По дате создания</option>
            <option value="alpha">По алфавиту (А-Я)</option>
            <option value="alphaDesc">По алфавиту (Я-А)</option>
            <option value="hours">По часам (возр.)</option>
            <option value="hoursDesc">По часам (убыв.)</option>
          </select>
          <div className="spacer" />
          {canCreateTask(ur) && (
            <button className="btn primary" onClick={onNew}>
              <Ic d={ICONS.plus} size={15} /> Задача
            </button>
          )}
        </div>
      )}
      
      <div className="kanban k5">
        {TASK_STATUS_ORDER.map((st) => {
          const list = visible.filter((t) => t.status === st);
          return (
            <div 
              key={st} 
              className={`kcol${dragOverCol === st ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(st); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => { 
                e.preventDefault(); 
                setDragOverCol(null); 
                const id = e.dataTransfer.getData("text/plain"); 
                if (id) {
                  const task = db.tasks.find(t => t.id === id);
                  if (task && !canChangeTaskStatus(ur, task, st, db)) {
                    alert('У вас нет прав на перевод задачи в статус ' + TASK_STATUSES[st].label);
                    return;
                  }
                  onMove(id, st); 
                }
              }}
            >
              <div className="kcol-head"><span className="kdot" style={{ background: TASK_STATUSES[st].color }} />{TASK_STATUSES[st].label}<span className="kcount">{list.length}</span></div>
              <div className="kcol-body">
                {list.length === 0 ? <div className="kempty">Нет задач</div> : list.map(t => {
                  const p = db.projects.find(x => x.id === t.projectId);
                  const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
                  const sp = t.logs.reduce((s, l) => s + l.hours, 0);
                  const overdue = t.deadline && !["closed", "cancelled"].includes(t.status) && t.deadline < TODAY;
                  const soon = t.deadline && !overdue && !["closed", "cancelled"].includes(t.status) && daysDiff(TODAY, t.deadline) <= 3;
                  const canDrag = (!["closed", "cancelled"].includes(t.status) && canChangeTaskStatus(ur, t, st, db));
                  const prioColor = PRIORITIES[t.priority]?.color || PRIORITIES.mid.color;
                  return (
                    <div 
                      key={t.id} 
                      className={`kcard${t.status === 'cancelled' ? ' dim' : ''}`} 
                      draggable={canDrag}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} 
                      onClick={() => openTask(t.id)}
                    >
                      <div className="kcard-prio" style={{ background: prioColor }} />
                      <div className="kcard-title">{t.title}</div>
                      <div className="kcard-proj"><span className="pdot" style={{ background: p?.color }} />{p?.code}</div>
                      <div className="kcard-meta">
                        {assignees.length > 0 && (
                          <span className="kassignee">
                            {assignees.slice(0, 2).map(a => (
                              <span 
                                key={a.id} 
                                className="avatar xs" 
                                style={{ marginRight: -4, cursor: 'pointer' }}
                                onMouseEnter={(e) => setTooltip({ visible: true, employee: a, x: e.clientX, y: e.clientY })}
                                onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                                onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                              >
                                {a.photo ? (
                                  <img src={a.photo} alt="Аватар" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  initials(a.first, a.last)
                                )}
                              </span>
                            ))}
                            {assignees.length > 2 && <span className="mut sm">+{assignees.length - 2}</span>}
                          </span>
                        )}
                        <span className="khours"><Ic d={ICONS.clock} size={13} /> {sp}/{t.plannedHours ?? "—"} ч</span>
                      </div>
                      <div className="kcard-foot"><span className={"kdl" + (overdue ? " late" : soon ? " soon" : "")}>{t.deadline ? (overdue ? `просрочено ${-daysDiff(TODAY, t.deadline)} дн` : `до ${fmtD(t.deadline)}`) : "без дедлайна"}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Легенда приоритетов */}
      <div className="gantt-legend" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)', marginTop: 16 }}>
        <span style={{ fontWeight: 600 }}>Приоритеты задач:</span>
        {Object.entries(PRIORITIES).map(([k, v]) => (
          <span key={k} style={{ marginLeft: 12 }}>
            <span className="lg-dot" style={{ background: v.color }} /> {v.label}
          </span>
        ))}
      </div>

      {/* Tooltip сотрудника */}
      <EmployeeTooltip {...tooltip} />
    </div>
  );
}