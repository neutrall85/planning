// src/components/views/ProductionCalendarView.jsx
import { useState, useMemo, memo } from 'react';
import { useSelector } from '../../context/StoreContext';
import { Ic, ICONS } from '../Icons';
import DateMaskInput from '../DateMaskInput';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { parseMaskedDates } from '../../utils/dateMask';
import { fmtDMY } from '../../utils/date';

const KIND_META = {
  holidays:  {
    title: 'Праздничные дни',
    empty: 'Праздников нет',
    placeholder: '01.01.2027 - 09.01.2027 или 07.01.2027 08.01.2027',
  },
  shortDays: {
    title: 'Сокращённые дни',
    empty: 'Сокращённых дней нет',
    placeholder: '08.05.2027 или 30.04.2027 - 11.06.2027',
  },
};

const DAY_NAMES = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

const formatDateWithWeekday = (isoDate) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return `${fmtDMY(isoDate)} · ${DAY_NAMES[day]}`;
};

const emptyDateDraft = { holidays: '', shortDays: '' };

function ProductionCalendarView({ store }) {
  const productionCalendar = useSelector(s => s.productionCalendar);

  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const years = useMemo(
    () => store.getProductionCalendarYears(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store, productionCalendar],
  );

  const [selectedYear, setSelectedYear] = useState(
    () => (years[0]?.year ?? new Date().getFullYear())
  );
  const [newYearDraft, setNewYearDraft] = useState('');
  const [dateDrafts, setDateDrafts] = useState(emptyDateDraft);

  const activeYear = useMemo(
    () => years.find(y => y.year === selectedYear) || null,
    [years, selectedYear],
  );

  const handleAddYear = () => {
    const year = Number(newYearDraft);
    if (!year) { showToast('Введите год', 'error'); return; }
    try {
      store.addProductionCalendarYear(year);
      setSelectedYear(year);
      setNewYearDraft('');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveYear = async (year) => {
    const ok = await confirm({
      title: 'Удалить год',
      message: `Удалить производственный календарь за ${year} год?`,
      confirmLabel: 'Удалить',
      danger: true,
    });
    if (!ok) return;
    try {
      store.removeProductionCalendarYear(year);
      const remaining = years.filter(y => y.year !== year);
      setSelectedYear(remaining[0]?.year ?? new Date().getFullYear());
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddDays = (kind) => {
    if (!activeYear) return;
    const text = dateDrafts[kind];
    if (!text.trim()) {
      showToast('Введите хотя бы одну дату', 'error');
      return;
    }

    const { valid, invalid } = parseMaskedDates(text);
    if (invalid.length > 0) {
      showToast(`Неверный ввод: ${invalid.join('; ')}`, 'error');
      return;
    }
    if (valid.length === 0) {
      showToast('Не введено ни одной даты', 'error');
      return;
    }

    const wrongYear = valid.filter(iso => Number(iso.slice(0, 4)) !== activeYear.year);
    if (wrongYear.length > 0) {
      showToast(`${wrongYear.length} дат(ы) не относятся к ${activeYear.year} году`, 'error');
      return;
    }

    try {
      store.addProductionCalendarDays(activeYear.year, kind, valid);
      setDateDrafts(prev => ({ ...prev, [kind]: '' }));
      showToast(`Добавлено дат: ${valid.length}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveDay = (kind, date) => {
    if (!activeYear) return;
    try {
      store.removeProductionCalendarDay(activeYear.year, kind, date);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const renderSection = (kind) => {
    const meta = KIND_META[kind];
    const items = activeYear?.[kind] || [];
    return (
      <div className="pc-section">
        <div className="pc-section-head">
          <span className="pc-section-title">{meta.title}</span>
          <span className="kcount">{items.length}</span>
        </div>

        <div className="pc-add-row">
          <DateMaskInput
            value={dateDrafts[kind]}
            onChange={v => setDateDrafts(prev => ({ ...prev, [kind]: v }))}
            placeholder={meta.placeholder}
            className="inp pc-date-input"
          />
          <button
            type="button"
            className="btn primary sm"
            onClick={() => handleAddDays(kind)}
          >
            <Ic d={ICONS.plus} size={13} /> Добавить
          </button>
        </div>

        {items.length === 0 ? (
          <div className="pc-empty">{meta.empty}</div>
        ) : (
          <div className="pc-date-list">
            {items.map(date => (
              <div key={date} className="pc-date-chip">
                <span className="pc-date-label">{formatDateWithWeekday(date)}</span>
                <button
                  type="button"
                  className="icon-btn xs"
                  onClick={() => handleRemoveDay(kind, date)}
                  title="Удалить"
                >
                  <Ic d={ICONS.x} size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rep">
      <div className="rep-panel p-4">
        <div className="rep-panel-title">Производственный календарь РФ</div>
        <p className="mut sm mb-3">
          Праздничные дни не учитываются при расчёте нормы рабочего времени.
          Сокращённые дни уменьшают норму на 1 час. Даты вводятся в формате
          ДД.ММ.ГГГГ. Несколько дат - через пробел. Диапазон - через тире:
          «01.01.2027 - 09.01.2027» добавит все 9 дней. Двузначный год
          разворачивается: «01.01.26» → 2026.
        </p>

        <div className="pc-year-tabs">
          {years.map(y => (
            <button
              key={y.year}
              type="button"
              className={`tab${y.year === selectedYear ? ' on' : ''}`}
              onClick={() => setSelectedYear(y.year)}
            >
              {y.year}
            </button>
          ))}

          <div className="pc-year-add">
            <input
              type="number"
              className="inp w-140"
              placeholder="Год"
              min="2000"
              max="2100"
              value={newYearDraft}
              onChange={e => setNewYearDraft(e.target.value)}
            />
            <button
              type="button"
              className="btn ghost sm"
              onClick={handleAddYear}
            >
              <Ic d={ICONS.plus} size={13} /> Год
            </button>
          </div>
        </div>
      </div>

      {!activeYear ? (
        <div className="rep-panel p-4">
          <div className="empty-note p-4">Выберите год или создайте новый</div>
        </div>
      ) : (
        <div className="rep-panel p-4">
          <div className="pc-active-head">
            <div className="rep-panel-title m-0">{activeYear.year} год</div>
            <button
              type="button"
              className="btn danger sm"
              onClick={() => handleRemoveYear(activeYear.year)}
            >
              <Ic d={ICONS.trash} size={13} /> Удалить год
            </button>
          </div>

          <div className="pc-sections">
            {renderSection('holidays')}
            {renderSection('shortDays')}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ProductionCalendarView);