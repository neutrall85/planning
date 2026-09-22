// src/components/Modals/YearCalendarModal.jsx
import { useState, useMemo } from 'react';
import { ModalShell } from '../ModalShell';
import { Ic, ICONS } from '../Icons';
import { DAY_STATUS } from '../../utils/workCalendar';
import { iso, fmtDMY } from '../../utils/date';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const WEEKDAY_LABELS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

// Date.getDay(): вс=0, пн=1, ..., сб=6. Для сетки «пн первый»:
// пн=0, вт=1, ..., вс=6 - сколько пустых ячеек до первого числа.
const mondayIndex = (jsDay) => (jsDay + 6) % 7;

const STATUS_CLASS = {
  [DAY_STATUS.WORKDAY]:  'yc-day--workday',
  [DAY_STATUS.SHORTDAY]: 'yc-day--shortday',
  [DAY_STATUS.WEEKEND]:  'yc-day--weekend',
  [DAY_STATUS.HOLIDAY]:  'yc-day--holiday',
};

/**
 * Просмотр производственного календаря на год.
 *
 * Класс modal-year-calendar - модификатор к .modal: задаёт минимальную
 * высоту, чтобы 12 месяцев не сжимались в плоскую полосу. Значение
 * живёт в CSS, не inline-стилем.
 *
 * Модалка просмотровая: ни сохранения, ни футера. Закрытие - крестик
 * в шапке, клик вне окна или Escape (стандарт для остальных смотровых
 * модалок проекта).
 */
export default function YearCalendarModal({ store, onClose }) {
  const [year, setYear] = useState(() => new Date().getFullYear());

  // Не useMemo: пересчёт тривиален, а корректность сохраняется даже если
  // модалка остаётся открытой через полночь - при следующем рендере
  // метка «сегодня» переедет на новый день.
  const todayIso = iso(new Date());

  const months = useMemo(() => store.getYearCalendar(year), [store, year]);

  return (
    <ModalShell
      title="Производственный календарь"
      onClose={onClose}
      width={1400}
      className="modal-year-calendar"
      showSave={false}
    >
      <div className="yc-nav">
        <button
          type="button"
          className="icon-btn"
          onClick={() => setYear(y => y - 1)}
          title="Предыдущий год"
        >
          <Ic d={ICONS.left} size={16} />
        </button>
        <div className="yc-year">{year}</div>
        <button
          type="button"
          className="icon-btn"
          onClick={() => setYear(y => y + 1)}
          title="Следующий год"
        >
          <Ic d={ICONS.right} size={16} />
        </button>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setYear(new Date().getFullYear())}
        >
          Сегодня
        </button>
        <span className="yc-today-hint">Сегодня: {fmtDMY(todayIso)}</span>
      </div>

      <div className="yc-grid">
        {months.map((m, idx) => (
          <Month
            key={m.month}
            month={m}
            name={MONTH_NAMES[idx]}
            year={year}
            todayIso={todayIso}
          />
        ))}
      </div>

      <div className="yc-legend">
        <span className="yc-legend-item">
          <span className="yc-legend-dot yc-legend-dot--workday" /> Рабочий
        </span>
        <span className="yc-legend-item">
          <span className="yc-legend-dot yc-legend-dot--shortday" /> Сокращённый
        </span>
        <span className="yc-legend-item">
          <span className="yc-legend-dot yc-legend-dot--weekend" /> Выходной/Праздничный
        </span>
        <span className="yc-legend-item">
          <span className="yc-legend-dot yc-legend-dot--today" /> Сегодня
        </span>
      </div>
    </ModalShell>
  );
}

function Month({ month, name, year, todayIso }) {
  const firstWeekday = mondayIndex(new Date(year, month.month, 1).getDay());
  const blanks = Array.from({ length: firstWeekday }, (_, i) => i);

  return (
    <div className="yc-month">
      <div className="yc-month-title">{name}</div>
      <div className="yc-weekdays">
        {WEEKDAY_LABELS.map(w => <span key={w}>{w}</span>)}
      </div>
      <div className="yc-days">
        {blanks.map(i => (
          <span key={`b${i}`} className="yc-day yc-day--empty" />
        ))}
        {month.days.map(d => {
          const classes = ['yc-day', STATUS_CLASS[d.status]];
          if (d.iso === todayIso) classes.push('yc-day--today');
          return (
            <span key={d.iso} className={classes.join(' ')}>{d.day}</span>
          );
        })}
      </div>
    </div>
  );
}