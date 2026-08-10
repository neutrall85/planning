import React, { useState, useMemo } from 'react';
import { TODAY, iso, addDays, parseISO, fmtD, fmtDMY, isTaskActive } from '../utils/date';
import { TASK_STATUSES, DEPENDENCY_TYPES, PROJECT_CATEGORIES, PRIORITIES } from '../utils/constants';
import { useDataHelpers } from '../hooks';
import { computeScope, taskVisible } from '../utils/permissions';
import { Ic, ICONS } from './Icons';

export default function Gantt({ db, ur, openTask, openProject }) {
  const { empName, getTaskSpent, vacOverlap } = useDataHelpers(db);
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  // Заменяем !t.archived на isTaskActive(t)
  const tasks = db.tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db) && t.start && t.deadline);

  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return iso(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [vacWarning, setVacWarning] = useState(null);

  const range = { month: 30, quarter: 90, year: 365 }[mode] || 30;
  const DW = 34;

  const shift = (dir) => {
    const current = parseISO(anchor);
    // Вычисляем первый день следующего/предыдущего периода на основе режима
    let newDate;
    if (mode === 'month') {
      newDate = new Date(current.getFullYear(), current.getMonth() + dir, 1);
    } else if (mode === 'quarter') {
      const currentQuarter = Math.floor(current.getMonth() / 3);
      const newQuarter = currentQuarter + dir;
      newDate = new Date(current.getFullYear(), newQuarter * 3, 1);
    } else if (mode === 'year') {
      newDate = new Date(current.getFullYear() + dir, 0, 1);
    } else {
      newDate = addDays(current, range * dir);
    }
    setAnchor(iso(newDate));
  };

  const ganttData = useMemo(() => {
    if (!tasks.length) return null;
    const days = [];
    const startDate = parseISO(anchor);
    for (let i = 0; i < range; i++) {
      days.push(iso(addDays(startDate, i)));
    }
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
  }, [tasks, db.projects, anchor, mode, range, scope]);

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

  return (
    <div className="gantt-panel">
      <div className="cal-head" style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
          <div className="cal-title" style={{ minWidth: '120px', fontSize: '15px', fontWeight: 700 }}>
            {fmtDMY(anchor)}
          </div>
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
        <div className="gantt">
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
              const category = PROJECT_CATEGORIES[g.project.category || 'NORM'] || PROJECT_CATEGORIES.NORM;
              return (
                <div key={g.project.id}>
                  <div className="gantt-group">
                    <div 
                      className="gantt-group-name" 
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => openProject && openProject(g.project.id)}
                      title="Открыть проект"
                    >
                      <span className="pdot" style={{ background: category.color }} />{g.project.code} · {g.project.name}
                      <span className="mut sm" style={{ marginLeft: 8, color: category.color, fontWeight: 600 }}>{category.label}</span>
                    </div>
                    <div style={{ width }} />
                  </div>
                  {g.items.map(t => {
                    const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
                    const a = assignees[0];
                    const left = t.sIdx * DW + 2;
                    const w = Math.max((t.eIdx - t.sIdx + 1) * DW - 4, DW - 8);
                    const sp = getTaskSpent(t);
                    
                    // Проверяем, есть ли делегирование у задачи (используем новые поля)
                    const hasDelegate = t.isDelegated && t.delegationEnd && new Date(t.delegationEnd) >= new Date(TODAY);
                    
                    // Показываем значок отпуска только если нет делегата
                    const vac = (!hasDelegate && a) ? vacOverlap(a.id, t.start, t.deadline) : null;
                    const vacValid = vac && vac.start && vac.end && vac.start <= vac.end;
                    // Показываем значок отпуска, если отпуск есть и он ещё не закончился (end >= TODAY)
                    const showVac = !hasDelegate && vac && (!vac.end || vac.end >= TODAY);
                    const tip = `${t.title}: ${fmtD(t.start)} — ${fmtD(t.deadline)}, план ${t.plannedHours ?? '—'} ч${showVac ? (vacValid ? `. Исполнитель в отпуске ${fmtDMY(vac.start)}–${fmtDMY(vac.end)}` : '. Внимание: исполнитель в отпуске, но даты отпуска не указаны корректно') : ''}`;
                    const prioColor = PRIORITIES[t.priority]?.color || PRIORITIES.mid.color;
                    
                    // Расчет процента выполнения (факт / план)
                    const planned = t.plannedHours || 0;
                    const spent = getTaskSpent(t);
                    const pct = planned > 0 ? Math.min(100, Math.round((spent / planned) * 100)) : 0;
                    
                    return (
                      <div key={t.id} className="gantt-row" style={{ position: 'relative' }}>
                        <div className="gantt-label" onClick={() => openTask(t.id)}>
                          <span className={`gtitle${t.status === 'cancelled' ? ' dim' : ''}`}>{t.title}</span>
                          <span className="gsub">{a ? a.last : ''} · {t.plannedHours ?? '—'} ч · {TASK_STATUSES[t.status].label}</span>
                        </div>
                        <div className="gantt-track" style={{ width }}>
                          <div className="gbar" style={{ left, width: w, background: prioColor + '33', border: `2px solid ${prioColor}`, cursor: 'pointer', opacity: t.status === 'cancelled' ? 0.45 : 1 }} onClick={() => {
                            // Всегда передаем данные об отпуске и делегировании
                            const vacData = hasDelegate 
                              ? { hasDelegate: true, delegatedFrom: t.delegatedFrom, delegatedTo: t.delegatedTo, delegationStart: t.delegationStart, delegationEnd: t.delegationEnd }
                              : (vac ? { vacation: vac, employee: a, hasDelegate: false } : null);
                            openTask(t.id, 'form', null, vacData);
                          }} title={tip}>
                            {pct > 0 && (
                              <div className="gbar-fill" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`, background: prioColor, opacity: 0.6 }} />
                            )}
                            {showVac && <span className="gbar-vac" title={vacValid ? "Исполнитель в отпуске в эти даты" : "Внимание: даты отпуска не указаны корректно"}>🏖</span>}
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
      {vacWarning && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setVacWarning(null)}>
          <div className="modal-content" style={{ background: '#fff', padding: '24px', borderRadius: '8px', maxWidth: '400px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', color: '#dc2626' }}>⚠️ Внимание</h3>
            <p style={{ margin: '0 0 12px' }}>Исполнитель <strong>{vacWarning.employee?.last} {vacWarning.employee?.first}</strong> находится в отпуске, но даты отпуска не указаны корректно.</p>
            {vacWarning.vac ? (
              <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>Даты отпуска: <strong>{vacWarning.vac.start ? fmtDMY(vacWarning.vac.start) : '—'} — {vacWarning.vac.end ? fmtDMY(vacWarning.vac.end) : '—'}</strong></p>
            ) : (
              <p style={{ margin: '0 0 12px', fontSize: '14px', color: '#64748b' }}>Даты отпуска: <strong>не указаны</strong></p>
            )}
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#64748b' }}>Задача: <strong>{vacWarning.task.title}</strong></p>
            <button className="btn primary" onClick={() => setVacWarning(null)} style={{ width: '100%', padding: '10px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Закрыть</button>
          </div>
        </div>
      )}
      <div className="gantt-legend" style={{ padding: '8px 16px', borderTop: '1px solid var(--line)' }}>
        <span><span className="lg-dot" style={{ background: '#e2e8f0' }} /> выходные</span>
        <span>🏖 — исполнитель в отпуске</span>
        <span style={{ marginLeft: 16, fontWeight: 600 }}>Приоритеты задач:</span>
        {Object.entries(PRIORITIES).map(([k, v]) => (
          <span key={k} style={{ marginLeft: 12 }}>
            <span className="lg-dot" style={{ background: v.color }} /> {v.label}
          </span>
        ))}
      </div>
    </div>
  );
}