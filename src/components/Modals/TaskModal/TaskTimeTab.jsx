// src/components/Modals/TaskModal/TaskTimeTab.jsx
import { TaskProgress } from './TaskProgress';
import { Ic, ICONS } from '../../Icons';
import { TODAY, fmtD } from '../../../utils/date';

/**
 * Вкладка «Учёт времени»: список внесённых логов + форма добавления
 * часов (видна только тем, кому разрешено логировать - canLog решается
 * в TaskModal/index.jsx через canLog из прав задачи).
 */
export function TaskTimeTab({
  spent, planned, logs, empName, canLog,
  logDate, setLogDate, logHours, setLogHours, logNote, setLogNote, onAddLog,
}) {
  return (
    <div className="tm-block">
      <TaskProgress value={spent} max={planned || 0} />
      {logs.map(l => (
        <div key={l.id} className="tm-log">
          <span className="tm-log-name">{empName(l.userId)}</span>
          <span className="mut">{fmtD(l.date)}</span>
          <span className="tm-log-note">{l.note}</span>
          <b className="tm-log-h">{l.hours} ч</b>
        </div>
      ))}
      {canLog && (
        <div className="tm-add">
          <input className="inp tm-add-date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} max={TODAY} />
          <input className="inp tm-add-hours" type="number" min="0.5" step="0.5" placeholder="часы" value={logHours} onChange={(e) => setLogHours(e.target.value)} />
          <input className="inp tm-add-note" placeholder="комментарий" value={logNote} onChange={(e) => setLogNote(e.target.value)} />
          <button className="btn ghost" onClick={onAddLog}><Ic d={ICONS.clock} size={14} /> Внести часы</button>
        </div>
      )}
    </div>
  );
}
