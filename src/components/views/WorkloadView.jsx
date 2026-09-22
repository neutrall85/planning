// src/components/views/WorkloadView.jsx
import { useState, useMemo, memo } from 'react';
import { SearchBox } from '../SearchBox';
import { SortControl } from '../SortControl';
import { Ic, ICONS } from '../Icons';
import WorkloadBar from '../WorkloadBar';
import { useWorkloadDb } from '../../hooks/useDb';
import { useFilters } from '../../hooks/useFilters';
import { useSort } from '../../hooks/useSort';
import { computeScope } from '../../utils/permissions';
import { getPrimaryDeptName } from '../../utils/helpers';
import { resolvePeriod } from '../../utils/workCalendar';
import { TODAY, iso, parseISO } from '../../utils/date';
import { formatPeriodLabel } from '../../utils/periodLabel';

const PERIOD_MODES = [
  { id: 'month', label: 'Месяц' },
  { id: 'quarter', label: 'Квартал' },
  { id: 'year', label: 'Год' },
  { id: 'custom', label: 'Период' },
];

/**
 * Опции поля «Сортировка». Собираются один раз на уровне модуля:
 * SORT_FIELDS - константа, ссылка стабильна, useMemo в компоненте не
 * нужен. Порядок опций в попапе нормализует сам Select (см. sortOptions).
 */
const SORT_FIELDS = [
  { id: 'name', label: 'ФИО' },
  { id: 'dept', label: 'Отдел' },
  { id: 'plan', label: 'План' },
  { id: 'fact', label: 'Факт' },
  { id: 'util', label: 'Загрузка' },
];

const SORT_OPTIONS = SORT_FIELDS.map((s) => ({ value: s.id, label: s.label }));

// Числовые поля — при смене поля дефолт «по убыванию» (сначала самые
// большие). Строковые — «по возрастанию» (А→Я). То же правило, что в
// TasksView / ProjectsView; вынесено в useSort.
const NUMERIC_SORTS = new Set(['plan', 'fact', 'util']);

const INITIAL_FILTERS = Object.freeze({
  query: '',
  sortField: 'name',
  sortDir: 'asc',
});

const shiftAnchor = (mode, anchorIso, dir) => {
  const d = parseISO(anchorIso);
  if (mode === 'month') d.setMonth(d.getMonth() + dir);
  else if (mode === 'quarter') d.setMonth(d.getMonth() + dir * 3);
  else d.setFullYear(d.getFullYear() + dir);
  return iso(d);
};

const employeeLabel = (e) => `${e.last} ${e.first}`;

function WorkloadView({ ur, store, openEmployeeTasks }) {
  const db = useWorkloadDb();
  const { employees } = db;
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(TODAY);
  const [customFrom, setCustomFrom] = useState(TODAY);
  const [customTo, setCustomTo] = useState(TODAY);

  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { query } = filters;

  const { field: sortField, dir: sortDir, handleFieldChange: handleSortFieldChange, handleDirToggle: handleSortDirToggle } =
    useSort({ filters, setFilter, numericFields: NUMERIC_SORTS });

  const { from, to } = useMemo(
    () => resolvePeriod(mode, anchor, customFrom, customTo),
    [mode, anchor, customFrom, customTo],
  );

  const periodCapacity = useMemo(
    () => store.getPeriodCapacity(from, to),
    [store, from, to],
  );

  const rows = useMemo(() => {
    const map = store.getWorkload(from, to);
    const empIndex = new Map(employees.map((e) => [e.id, e]));
    const out = [];
    for (const [empId, e] of map) {
      if (!scope.all && !scope.empIds.has(empId)) continue;
      const employee = empIndex.get(empId);
      if (!employee) continue;
      out.push({
        employee,
        planTotal: e.planTotal,
        factTotal: e.factTotal,
        capacity: e.capacity,
        utilization: e.capacity > 0 ? (e.planTotal / e.capacity) * 100 : 0,
        deptName: getPrimaryDeptName(employee, db),
      });
    }
    return out;
  }, [store, from, to, db, employees, scope]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        employeeLabel(r.employee).toLowerCase().includes(q) ||
        r.deptName.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    const mul = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let va, vb;
      if (sortField === 'plan') {
        va = a.planTotal; vb = b.planTotal;
      } else if (sortField === 'fact') {
        va = a.factTotal; vb = b.factTotal;
      } else if (sortField === 'util') {
        va = a.utilization; vb = b.utilization;
      } else if (sortField === 'dept') {
        va = a.deptName.toLowerCase(); vb = b.deptName.toLowerCase();
      } else {
        va = employeeLabel(a.employee).toLowerCase();
        vb = employeeLabel(b.employee).toLowerCase();
      }
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
    return list;
  }, [filtered, sortField, sortDir]);

  const totals = useMemo(() => {
    let plan = 0, fact = 0, capacity = 0;
    for (const r of filtered) {
      plan += r.planTotal;
      fact += r.factTotal;
      capacity += r.capacity;
    }
    return {
      plan,
      fact,
      capacity,
      utilization: capacity > 0 ? (plan / capacity) * 100 : 0,
    };
  }, [filtered]);

  const periodLabel = formatPeriodLabel(mode, anchor, from, to);

  return (
    <div className="rep">
      <div className="rep-panel p-4">
        <div className="workload-toolbar">
          <div className="seg sm">
            {PERIOD_MODES.map((m) => (
              <button
                type="button"
                key={m.id}
                className={`seg-btn${mode === m.id ? ' on' : ''}`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode !== 'custom' ? (
            <div className="cal-nav">
              <button
                type="button"
                className="icon-btn"
                onClick={() => setAnchor(shiftAnchor(mode, anchor, -1))}
              >
                <Ic d={ICONS.left} size={16} />
              </button>
              <div className="workload-period">{periodLabel}</div>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setAnchor(shiftAnchor(mode, anchor, 1))}
              >
                <Ic d={ICONS.right} size={16} />
              </button>
              <button className="btn ghost sm" onClick={() => setAnchor(TODAY)}>
                Сегодня
              </button>
            </div>
          ) : (
            <div className="workload-custom-range">
              <input
                type="date"
                className="inp w-150"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <span className="mut">-</span>
              <input
                type="date"
                className="inp w-150"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="workload-toolbar mt-3">
          <SearchBox
            value={query}
            onChange={(v) => setFilter('query', v)}
            placeholder="Поиск по ФИО или отделу…"
            className="workload-search"
          />
          <label className="lbl m-0">Сортировка:</label>
          <SortControl
            options={SORT_OPTIONS}
            field={sortField}
            dir={sortDir}
            onFieldChange={handleSortFieldChange}
            onToggleDir={handleSortDirToggle}
            compact
          />
        </div>
      </div>

      <div className="rep-panel p-4">
        <div className="rep-panel-title">
          Загрузка сотрудников · {periodLabel} · {sorted.length}
        </div>
        <div className="workload-period-meta">
          Рабочих дней: <b>{periodCapacity.workdays}</b> ·{' '}
          Рабочих часов в периоде: <b>{periodCapacity.hours}</b>
          <span className="mut"> ({periodCapacity.hoursPerDay} ч / раб. день)</span>
        </div>

        {sorted.length === 0 ? (
          <div className="empty-note p-4">Нет сотрудников, подходящих под фильтр</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl workload-table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Отдел</th>
                  <th className="workload-col-bar">План</th>
                  <th className="workload-col-bar">Факт</th>
                  <th className="text-right">Загрузка</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr
                    key={r.employee.id}
                    className="clickable-row"
                    onClick={() => openEmployeeTasks(r.employee.id)}
                  >
                    <td><b>{employeeLabel(r.employee)}</b></td>
                    <td className="mut">{r.deptName}</td>
                    <td>
                      <div className="workload-cell">
                        <WorkloadBar value={r.planTotal} max={r.capacity} variant="plan" />
                        <span className="workload-hours">{Math.round(r.planTotal)} ч</span>
                      </div>
                    </td>
                    <td>
                      <div className="workload-cell">
                        <WorkloadBar value={r.factTotal} max={r.capacity} variant="fact" />
                        <span className="workload-hours">{Math.round(r.factTotal)} ч</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className={`workload-util${r.utilization > 100 ? ' over' : ''}`}>
                        {Math.round(r.utilization)}%
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="workload-total-row">
                  <td><b>Итого</b></td>
                  <td className="mut">{sorted.length} сотр.</td>
                  <td>
                    <div className="workload-cell">
                      <WorkloadBar value={totals.plan} max={totals.capacity} variant="plan" />
                      <span className="workload-hours">{Math.round(totals.plan)} ч</span>
                    </div>
                  </td>
                  <td>
                    <div className="workload-cell">
                      <WorkloadBar value={totals.fact} max={totals.capacity} variant="fact" />
                      <span className="workload-hours">{Math.round(totals.fact)} ч</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <span className={`workload-util${totals.utilization > 100 ? ' over' : ''}`}>
                      {Math.round(totals.utilization)}%
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(WorkloadView);