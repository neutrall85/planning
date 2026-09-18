// src/components/HistoryTab.jsx
import { fmtDT } from '../utils/date';

/**
 * Универсальная вкладка «История» - для задачи и проекта.
 *
 * Формат записи: { ts, who, text }. Порядок отображения - от свежих
 * к старым (массив в сторе хранит хронологию, реверс делает рендер).
 * Отдельный компонент, а не дублирование разметки в двух модалках:
 * список из одного и того же класса tm-log с одним и тем же форматом
 * полей; если появится третий вид карточки - подключится сюда же.
 */
export const HistoryTab = ({ history, empName }) => (
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