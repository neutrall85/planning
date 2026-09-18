// src/components/Modals/TaskModal/TaskHistoryTab.jsx
import { fmtDT } from '../../../utils/date';

/** Вкладка «История»: лог изменений задачи, самые свежие записи сверху. */
export function TaskHistoryTab({ history, empName }) {
  return (
    <div className="tm-logs tm-logs-hist">
      {[...history].reverse().map((h, i) => (
        <div key={i} className="tm-log">
          <span className="tm-log-name">{h.who === 'system' ? 'Система' : empName(h.who)}</span>
          <span className="mut sm">{fmtDT(h.ts)}</span>
          <span className="tm-log-note">{h.text}</span>
        </div>
      ))}
    </div>
  );
}
