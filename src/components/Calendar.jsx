import React, { useState, useMemo } from 'react';
import { iso, addDays, fmtDMY, isTaskActive, initials, parseISO } from '../utils/date';
import { taskVisible, computeScope, hasRole } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import EmployeeTooltip from './EmployeeTooltip';

const DayCell = ({ d, big, byDay, db, openTask, onAvatarEnter, onAvatarLeave, onAvatarMove }) => {
  const dayIso = iso(d);
  const tasks = byDay[dayIso] || [];

  return (
    <div className={`cal-cell${dayIso === iso(new Date()) ? ' today' : ''}`}>
      <div className="cal-daynum">{d.getDate()}</div>
      <div className="cal-chips">
        {tasks.slice(0, big ? 12 : 3).map(t => {
          const p = db.projects.find(x => x.id === t.projectId);
          const assignees = (t.assigneeIds || []).map(id => db.employees.find(e => e.id === id)).filter(Boolean);
          const prioColor = t.priority ? (t.priority === 'high' ? '#ef4444' : t.priority === 'crit' ? '#dc2626' : t.priority === 'low' ? '#3b82f6' : '#f59e0b') : '#f59e0b';
          const statusColor = t.status === 'closed' ? '#10b981' : t.status === 'cancelled' ? '#64748b' : prioColor;
          return (
            <div key={t.id} className="cal-chip" style={{ borderColor: statusColor, background: statusColor + '1a' }} onClick={() => openTask(t.id)}>
              <div className="cal-task-title">
                <span className="pdot" style={{ background: statusColor }} />
                <span>{t.title}</span>
              </div>
              <div className="cal-executor">
                {/* Только аватарки исполнителей для tooltip */}
                <div style={{ display: 'flex', gap: -4 }}>
                  {assignees.slice(0, 3).map(a => (
                    <span
                      key={a.id}
                      className="avatar xs"
                      title={`${a.last} ${a.first}`}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => onAvatarEnter && onAvatarEnter(e, a)}
                      onMouseLeave={onAvatarLeave}
                      onMouseMove={(e) => onAvatarMove && onAvatarMove(e)}
                    >
                      {a.photo ? (
                        <img src={a.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        initials(a.first, a.last)
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function Calendar({ db, ur, openTask }) {
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);
  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(new Date());
  const [showOnlyMy, setShowOnlyMy] = useState(false);
  const [tooltip, setTooltip] = useState({ visible: false, employee: null, x: 0, y: 0 });

  // Определяем, показывать ли чекбокс – только если пользователь видит не только свои задачи
  const canSeeAll = hasRole(ur, "admin", "director", "economist", "kb_chief", "head", "project_lead", "project_manager");

  // Обработчики для tooltip
  const handleAvatarEnter = (e, employee) => {
    setTooltip(prev => ({ ...prev, visible: true, employee, x: e.clientX, y: e.clientY }));
  };
  const handleAvatarLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };
  const handleAvatarMove = (e) => {
    setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }));
  };

  // Сначала получаем все задачи, которые видны пользователю
  let allTasks = db.tasks.filter(t => isTaskActive(t) && taskVisible(ur, scope, t, db) && t.deadline && !['closed','cancelled'].includes(t.status));

  // Применяем фильтр "Только мои задачи"
  if (showOnlyMy) {
    allTasks = allTasks.filter(t => (t.assigneeIds || []).includes(ur.id));
  }

  const byDay = useMemo(() => {
    const m = {};
    allTasks.forEach(t => { 
      const deadlineIso = t.deadline ? iso(parseISO(t.deadline)) : null;
      if (deadlineIso) {
        (m[deadlineIso] = m[deadlineIso] || []).push(t); 
      }
    });
    return m;
  }, [allTasks]);

  const shift = (dir) => {
    if (mode === 'month') setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    else if (mode === 'week') setAnchor(addDays(anchor, dir * 7));
    else setAnchor(addDays(anchor, dir));
  };
  const title = mode === 'month' ? `${['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][anchor.getMonth()]} ${anchor.getFullYear()}` :
    mode === 'week' ? `Неделя ${fmtDMY(iso(addDays(anchor, -((anchor.getDay()+6)%7))))} — ${fmtDMY(iso(addDays(anchor, 6-((anchor.getDay()+6)%7))))}` : fmtDMY(iso(anchor));

  let body = null;
  if (mode === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const cells = []; for (let i=0; i<42; i++) cells.push(addDays(first, i-offset));
    body = (<>
      <div className="cal-grid-head">{['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(w => <div key={w} className="cal-wd">{w}</div>)}</div>
      <div className="cal-grid">{cells.map(d => <div key={iso(d)} className={d.getMonth()===anchor.getMonth()?'':'outwrap'}><DayCell d={d} big={false} byDay={byDay} db={db} openTask={openTask} onAvatarEnter={handleAvatarEnter} onAvatarLeave={handleAvatarLeave} onAvatarMove={handleAvatarMove} /></div>)}</div>
    </>);
  } else if (mode === 'week') {
    const mon = addDays(anchor, -((anchor.getDay()+6)%7));
    body = <div className="cal-week">{[0,1,2,3,4,5,6].map(i => <DayCell key={i} d={addDays(mon, i)} big byDay={byDay} db={db} openTask={openTask} onAvatarEnter={handleAvatarEnter} onAvatarLeave={handleAvatarLeave} onAvatarMove={handleAvatarMove} />)}</div>;
  } else {
    body = <div className="cal-week one"><DayCell d={anchor} big byDay={byDay} db={db} openTask={openTask} onAvatarEnter={handleAvatarEnter} onAvatarLeave={handleAvatarLeave} onAvatarMove={handleAvatarMove} /></div>;
  }

  return (
    <div className="cal-panel">
      <div className="cal-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}><Ic d={ICONS.left} size={16} /></button>
          <div className="cal-title">{title}</div>
          <button className="icon-btn" onClick={() => shift(1)}><Ic d={ICONS.right} size={16} /></button>
        </div>
        <div className="cal-right">
          <div className="seg">{['day','week','month'].map(m => <button key={m} className={`seg-btn${mode===m?' on':''}`} onClick={() => setMode(m)}>{['День','Неделя','Месяц'][['day','week','month'].indexOf(m)]}</button>)}</div>
          {canSeeAll && (
            <label className="dept-pick" style={{ marginLeft: 8 }}>
              <input type="checkbox" checked={showOnlyMy} onChange={(e) => setShowOnlyMy(e.target.checked)} />
              <span style={{ fontSize: 13 }}>Мои задачи</span>
            </label>
          )}
        </div>
      </div>
      <div className="cal-note">Только задачи со сроками.</div>
      {body}
      {/* Tooltip сотрудника */}
      <EmployeeTooltip {...tooltip} />
    </div>
  );
}