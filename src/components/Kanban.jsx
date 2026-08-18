import React, { useState, useMemo } from 'react';
import { Ic, ICONS } from './Icons';
import { TASK_STATUSES, TASK_STATUS_ORDER, PRIORITIES } from '../utils/constants';
import { TODAY, fmtD, daysDiff, initials, isTaskActive } from '../utils/date';
import { computeScope, taskVisible, canCreateTask, canChangeTaskStatus, hasRole } from '../utils/permissions';

export default function Kanban({ db, ur, openTask, onMove, onNew }) {
  const [fProj, setFProj] = useState("all");
  const [fExec, setFExec] = useState("all");
  const [fPrio, setFPrio] = useState("all");
  const [fDept, setFDept] = useState("all");
  const [q, setQ] = useState("");
  const [dragOverCol, setDragOverCol] = useState(null);
  const [showOnlyMy, setShowOnlyMy] = useState(false);

  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  // Определяем, показывать ли чекбокс "Только мои задачи" – только если пользователь видит не только свои задачи
  const canSeeAll = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");

  const visible = useMemo(() => {
    let list = db.tasks.filter((t) => isTaskActive(t) && taskVisible(ur, scope, t, db));
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
    // Фильтр "Только мои задачи"
    if (showOnlyMy) {
      list = list.filter(t => (t.assigneeIds || []).includes(ur.id));
    }
    return list;
  }, [db, ur, scope, fProj, fExec, fPrio, fDept, q, showOnlyMy]);

  const isOnlyExecutor = ur.roles.length === 1 && ur.roles[0] === 'executor';

  return (
    <div>
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
            <input type="checkbox" checked={showOnlyMy} onChange={(e) => setShowOnlyMy(e.target.checked)} />
            <span style={{ fontSize: 13 }}>Только мои задачи</span>
          </label>
        )}
        <div className="spacer" />
        {canCreateTask(ur) && (
          <button className="btn primary" onClick={onNew}>
            <Ic d={ICONS.plus} size={15} /> Задача
          </button>
        )}
      </div>
      
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
                  return (
                    <div 
                      key={t.id} 
                      className={`kcard${t.status === 'cancelled' ? ' dim' : ''}`} 
                      draggable={canDrag}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id)} 
                      onClick={() => openTask(t.id)}
                    >
                      <div className="kcard-prio" style={{ background: PRIORITIES[t.priority].color }} />
                      <div className="kcard-title">{t.title}</div>
                      <div className="kcard-proj"><span className="pdot" style={{ background: p?.color }} />{p?.code}</div>
                      <div className="kcard-meta">
                        {assignees.length > 0 && (
                          <span className="kassignee">
                            {assignees.slice(0, 2).map(a => (
                              <span key={a.id} className="avatar xs" style={{ marginRight: -4 }}>
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
    </div>
  );
}