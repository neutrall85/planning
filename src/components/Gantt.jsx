import React, { useState, useMemo } from 'react';
import { TODAY, iso, addDays, parseISO, fmtD, fmtDMY, isTaskActive } from '../utils/date';
import { TASK_STATUSES, DEPENDENCY_TYPES, PRIORITIES } from '../utils/constants';
import { useDataHelpers } from '../hooks';
import { computeScope, taskVisible } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import Avatar from './Avatar';
import { getProjectColor } from '../utils/projectHelpers';

export default function Gantt({ db, ur, openTask, openProject }) {
  const { empName, getTaskSpent, vacOverlap } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const tasks = db.tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db) && t.start && t.deadline);

  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return iso(new Date(d.getFullYear(), d.getMonth(), 1));
  });

  const DW = 34;

  const getDaysInRange = (anchorDate, mode) => {
    const start = parseISO(anchorDate);
    const days = [];
    if (mode === 'month') {
      const year = start.getFullYear();
      const month = start.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 0; i < daysInMonth; i++) {
        days.push(iso(new Date(year, month, i + 1)));
      }
    } else if (mode === 'quarter') {
      for (let i = 0; i < 90; i++) {
        days.push(iso(addDays(start, i)));
      }
    } else {
      for (let i = 0; i < 365; i++) {
        days.push(iso(addDays(start, i)));
      }
    }
    return days;
  };

  const shift = (dir) => {
    let newAnchor;
    if (mode === 'month') {
      const d = parseISO(anchor);
      d.setMonth(d.getMonth() + dir);
      newAnchor = iso(d);
    } else if (mode === 'quarter') {
      const d = parseISO(anchor);
      d.setMonth(d.getMonth() + dir * 3);
      newAnchor = iso(d);
    } else {
      const d = parseISO(anchor);
      d.setFullYear(d.getFullYear() + dir);
      newAnchor = iso(d);
    }
    setAnchor(newAnchor);
  };

  const ganttData = useMemo(() => {
    if (!tasks.length) return null;
    const days = getDaysInRange(anchor, mode);
    const months = [];
    days.forEach((day, i) => {
      const d = parseISO(day);
      const lbl = `${['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][d.getMonth()]} ${d.getFullYear()}`;
      if (!months.length || months[months.length-1].label !== lbl) months.push({ label: lbl, from: i, to: i });
      else months[months.length-1].to = i;
    });
    const viewStart = days[0];
    const viewEnd = days[days.length - 1];
    const groups = [];
    const seen = new Set();
    tasks.forEach(t => {
      if (!seen.has(t.projectId)) {
        seen.add(t.projectId);
        const project = db.projects.find(p => p.id === t.projectId);
        if (project && (scope.all || scope.projIds.has(project.id))) {
          groups.push({ project, items: [] });
        }
      }
    });
    groups.forEach(g => {
      const items = tasks
        .filter(t => t.projectId === g.project.id)
        .map(t => {
          let sIdx = days.indexOf(t.start);
          let eIdx = days.indexOf(t.deadline);
          if (sIdx === -1 && eIdx === -1) {
            if (t.start < viewStart && t.deadline > viewEnd) {
              sIdx = 0; eIdx = days.length - 1;
            } else {
              return null;
            }
          }
          if (sIdx === -1 && t.start < viewStart) sIdx = 0;
          if (eIdx === -1 && t.deadline > viewEnd) eIdx = days.length - 1;
          if (sIdx === -1 || eIdx === -1) return null;
          if (sIdx > eIdx) return null;
          return { ...t, sIdx, eIdx };
        })
        .filter(Boolean)
        .sort((a,b) => (a.start < b.start ? -1 : 1));
      g.items = items;
    });
    return { days, months, groups: groups.filter(g => g.items.length > 0) };
  }, [tasks, db.projects, anchor, mode, scope]);

  if (!ganttData || ganttData.groups.length === 0) {
    return (
      <div className="gantt-panel">
        <div className="cal-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <div className="cal-nav">
            <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
            <div className="cal-title" style={{ minWidth: '120px', fontSize: '15px', fontWeight: 700 }}>{fmtDMY(anchor)}</div>
            <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
          </div>
          <div className="cal-right">
            <div className="seg">
              {[['month','Месяц'], ['quarter','Квартал'], ['year','Год']].map(([m,l]) => (
                <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="empty-note" style={{ padding: '60px 0' }}>Нет доступных задач в выбранном периоде</div>
      </div>
    );
  }

  const { days, months, groups } = ganttData;
  const todayIdx = days.indexOf(TODAY);
  const width = days.length * DW;
  const totalWidth = width + 240;

  const getDepCoords = (t, depTask, depItem) => {
    if (!depTask || !depItem) return null;
    const tLeft = t.sIdx * DW + DW/2;
    const tRight = t.eIdx * DW + DW/2;
    const depLeft = depItem.sIdx * DW + DW/2;
    const depRight = depItem.eIdx * DW + DW/2;
    switch (t.dependencyType) {
      case 'SS': return { fromX: depLeft, toX: tLeft, fromY: -25, toY: -10 };
      case 'FF': return { fromX: depRight, toX: tRight, fromY: -25, toY: -10 };
      case 'SF': return { fromX: depLeft, toX: tRight, fromY: -25, toY: -10 };
      default: return { fromX: depRight, toX: tLeft, fromY: -25, toY: -10 };
    }
  };

  return (
    <div className="gantt-panel">
      <div className="cal-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
          <div className="cal-title" style={{ minWidth: '120px', fontSize: '15px', fontWeight: 700 }}>{fmtDMY(anchor)}</div>
          <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
        </div>
        <div className="cal-right">
          <div className="seg">
            {[['month','Месяц'], ['quarter','Квартал'], ['year','Год']].map(([m,l]) => (
              <button key={m} className={`seg-btn${mode === m ? ' on' : ''}`} onClick={() => setMode(m)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="gantt-scroll">
        <div className="gantt" style={{ '--gantt-width': totalWidth + 'px' }}>
          <div className="gantt-top">
            <div className="gantt-corner">Проект / задача</div>
            <div className="gantt-axis" style={{ width }}>
              <div className="gantt-months" style={{ display: 'flex', flexWrap: 'nowrap', width }}>
                {months.map((m, i) => (
                  <div key={i} className="gantt-month" style={{ width: (m.to - m.from + 1) * DW, flex: 'none' }}>
                    {m.label}
                  </div>
                ))}
              </div>
              <div className="gantt-days" style={{ display: 'flex', flexWrap: 'nowrap', width }}>
                {days.map(d => {
                  const dt = parseISO(d);
                  const wk = dt.getDay();
                  return (
                    <div
                      key={d}
                      className={`gday${(wk === 0 || wk === 6) ? ' wk' : ''}${d === TODAY ? ' td' : ''}`}
                      style={{ width: DW, flex: 'none', whiteSpace: 'nowrap', boxSizing: 'border-box' }}
                    >
                      {dt.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="gantt-body">
            <div className="gantt-grid" style={{ width, left: 240 }}>
              {days.map(d => <div key={d} className={`gcell${([0,6].includes(parseISO(d).getDay()) ? ' wk' : '')}`} style={{ width: DW, flex: 'none' }} />)}
              {todayIdx >= 0 && <div className="gtoday" style={{ left: todayIdx * DW + DW/2 }} />}
            </div>
            {groups.map(g => {
              const taskDeps = g.items.reduce((acc, t) => {
                if (t.dependencyId) acc[t.id] = db.tasks.find(dt => dt.id === t.dependencyId);
                return acc;
              }, {});
              const projectColor = getProjectColor(g.project);

              return (
                <div key={g.project.id}>
                  <div className="gantt-group">
                    <div 
                      className="gantt-group-name" 
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => openProject && openProject(g.project.id)}
                      title="Открыть проект"
                    >
                      <span className="pdot" style={{ background: projectColor }} />{g.project.code} · {g.project.name}
                    </div>
                    <div style={{ width }} />
                  </div>
                  {g.items.map(t => {
                    const assignee = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
                    const left = t.sIdx * DW + 2;
                    const w = Math.max((t.eIdx - t.sIdx + 1) * DW - 4, DW - 8);
                    const sp = getTaskSpent(t);
                    const pct = Math.min(100, (sp / Math.max(1, t.plannedHours || 0)) * 100);
                    const fillWidth = pct > 0 ? Math.max(pct, 2) : 0;
                    const vac = assignee ? vacOverlap(assignee.id, t.start, t.deadline) : null;
                    const tip = `${t.title}: ${fmtD(t.start)} — ${fmtD(t.deadline)}, план ${t.plannedHours ?? '—'} ч${vac ? `. Исполнитель в отпуске ${fmtDMY(vac.start)}–${fmtDMY(vac.end)}` : ''}`;
                    const depTask = taskDeps[t.id];
                    let depLine = null;
                    if (depTask) {
                      const depItem = g.items.find(it => it.id === depTask.id);
                      if (depItem) {
                        const coords = getDepCoords(t, depTask, depItem);
                        if (coords) {
                          depLine = (
                            <svg
                              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
                            >
                              <path
                                d={`M ${coords.fromX} ${coords.fromY} L ${coords.toX} ${coords.fromY} L ${coords.toX} ${coords.toY}`}
                                fill="none"
                                stroke="#94a3b8"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                                markerEnd="url(#arrowhead)"
                              />
                              <text
                                x={(coords.fromX + coords.toX) / 2}
                                y={coords.fromY - 5}
                                fontSize="10"
                                fill="#64748b"
                                textAnchor="middle"
                              >
                                {t.dependencyType || 'FS'}
                              </text>
                            </svg>
                          );
                        }
                      }
                    }

                    const priorityColor = PRIORITIES[t.priority]?.color || '#64748b';
                    const bgColor = priorityColor + '33';

                    return (
                      <div key={t.id} className="gantt-row" style={{ position: 'relative' }}>
                        {depLine}
                        <div className="gantt-label" onClick={() => openTask(t.id)}>
                          <span className={`gtitle${t.status === 'cancelled' ? ' dim' : ''}`}>{t.title}</span>
                          <span className="gsub">
                            {assignee && <Avatar employee={assignee} size="xs" />} · {t.plannedHours ?? '—'} ч · {TASK_STATUSES[t.status].label}
                          </span>
                        </div>
                        <div className="gantt-track">
                          <div
                            className="gbar"
                            style={{
                              '--bar-left': left + 'px',
                              '--bar-width': w + 'px',
                              '--bar-bg': bgColor,
                              '--bar-opacity': t.status === 'cancelled' ? 0.45 : 1,
                              '--fill-width': fillWidth + '%',
                              '--fill-color': t.status === 'closed' ? '#10b981' : priorityColor
                            }}
                            onClick={() => openTask(t.id)}
                            title={tip}
                          >
                            <div className="gbar-fill" />
                            {vac && <span className="gbar-vac">🏖</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="gantt-legend" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)' }}>
        <span><span className="lg-dot" style={{ background: '#ef4444' }} /> сегодня</span>
        <span><span className="lg-dot" style={{ background: '#e2e8f0' }} /> выходные</span>
        <span>🏖 — исполнитель в отпуске</span>
        <span>Заполнение полосы — факт / план</span>
      </div>
    </div>
  );
}