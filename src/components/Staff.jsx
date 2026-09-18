// src/components/Staff.jsx
import React, { useState, useMemo, useCallback } from "react";
import { ROLES, VACATION_TYPES, DIALOGS, TOASTS } from "../utils/constants";
import { TODAY, fmtDMY } from "../utils/date";
import {
  canEditDepartments,
  canEditRoles,
  canManageAllVacations,
  canFireEmployee,
} from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers, useFilters } from "../hooks";
import { useToast } from "../context/ToastContext";
import { useConfirm } from "../context/ConfirmContext";
import { EditEmployeeModal } from "./Modals/EditEmployeeModal";
import { CreateEmployeeModal } from "./Modals/CreateEmployeeModal";
import Avatar from "./Avatar";
import FloatingMenu from "./FloatingMenu";
import { SearchBox } from "./SearchBox";
import { getPrimaryDeptName, getPositionInDept } from "../utils/helpers";

const INITIAL_FILTERS = Object.freeze({
  query: '',
});

const NORM_HOURS = 160;

/**
 * Совпадает ли сотрудник поисковой строке.
 *
 * Ищем по ФИО, личной должности и по должностям в отделах (они видны
 * в карточках). Названия отделов тоже учитываются - пользователь может
 * искать «аэродинамики».
 */
const matchesQuery = (emp, q, db) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (`${emp.last} ${emp.first}`.toLowerCase().includes(needle)) return true;
  if ((emp.position || '').toLowerCase().includes(needle)) return true;

  const deptText = (emp.departments || [])
    .map(d => {
      const name = db.departments.find(x => x.id === d.deptId)?.name || '';
      const pos = d.position || '';
      return `${name} ${pos}`;
    })
    .join(' ')
    .toLowerCase();

  return deptText.includes(needle);
};

/**
 * Строка сотрудника.
 *
 * deptId - контекст: секция какого отдела сейчас рендерится.
 *   - для renderDepartment(deptId) - конкретный отдел;
 *   - для руководства, chiefs и уволенных - null.
 *
 * Под именем показывается ОДНА должность в этом отделе (см.
 * getPositionInDept): название отдела не дублируется, потому что оно
 * уже в заголовке секции. Плашка «совм» - только когда должность
 * относится к совмещению.
 *
 * Все «числовые» и «строковые» данные приходят снаружи примитивами
 * (plan, cnt, vacationEnd), а не через общий объект db. Это позволяет
 * React.memo работать: правка чужой задачи/отпуска не пересоздаёт
 * пропсы этой строки.
 */
const EmployeeRow = React.memo(({
  employee,
  isFired,
  ur,
  deptId,
  plan,
  cnt,
  vacationEnd,
  openDepts,
  openRoles,
  store,
  canFire,
  openEditEmployee,
}) => {
  const norm = NORM_HOURS;
  const pct = Math.min(100, Math.round((plan / norm) * 100));

  // getPositionInDept не читает db - третий аргумент в теле не
  // используется, поэтому в deps его нет.
  const position = useMemo(
    () => getPositionInDept(employee, deptId),
    [employee, deptId],
  );

  const handleFireToggle = useCallback(() => {
    try {
      store.setEmployeeFired(employee.id, !employee.fired);
    } catch (err) {
      console.error(err);
    }
  }, [employee.id, employee.fired, store]);

  const buildEmployeeMenu = () => {
    const items = [];

    if (canEditDepartments(ur)) {
      items.push({
        id: 'edit',
        label: 'Редактировать',
        icon: ICONS.edit,
        onClick: () => openEditEmployee(employee.id),
      });
      if (!isFired) {
        items.push({
          id: 'depts',
          label: 'Подразделения',
          icon: ICONS.users,
          onClick: () => openDepts(employee.id),
        });
      }
    }

    if (canEditRoles(ur) && !isFired) {
      items.push({
        id: 'roles',
        label: 'Роли',
        icon: ICONS.shield,
        onClick: () => openRoles(employee.id),
      });
    }

    if (canFire) {
      if (items.length) items.push({ type: 'divider' });
      items.push({
        id: 'fire',
        label: isFired ? 'Восстановить' : 'Уволить',
        icon: isFired ? ICONS.restore : ICONS.x,
        danger: !isFired,
        onClick: handleFireToggle,
      });
    }

    return items;
  };

  const menuItems = buildEmployeeMenu();

  return (
    <div className="st-row">
      <Avatar employee={employee} size="sm" />
      <div className="st-name">
        <div className="st-fio">
          {employee.last} {employee.first}
          {isFired && <span className="vac-badge fired">Уволен</span>}
          {vacationEnd && <span className="vac-badge">в отпуске до {fmtDMY(vacationEnd)}</span>}
        </div>
        <div className="st-pos">
          <span>{position.position}</span>
          {position.isExtra && <span className="pos-tag">совм</span>}
        </div>
      </div>
      <div className="st-roles">
        {employee.roles.map(r => (
          <span key={r} className="role-chip" style={{ background: ROLES[r].color + '1e', color: ROLES[r].color }}>{ROLES[r].short}</span>
        ))}
      </div>
      {!isFired && (
        <div className="st-load">
          <div className="st-load-bar"><div className={`st-load-fill${plan > norm ? ' over' : ''}`} style={{ width: pct + '%' }} /></div>
          <span className={`st-load-txt${plan > norm ? ' over' : ''}`}>{plan} ч · {Math.round((plan / norm) * 100)}%</span>
        </div>
      )}
      <div className="st-nums"><b>{isFired ? '-' : cnt}</b><span>задач</span></div>

      {menuItems.length > 0 && (
        <FloatingMenu items={menuItems}>
          {({ buttonProps }) => (
            <button
              {...buttonProps}
              className="icon-btn"
              title="Действия"
              aria-label={`Действия с ${employee.last} ${employee.first}`}
            >
              <Ic d={ICONS.more} size={16} />
            </button>
          )}
        </FloatingMenu>
      )}
    </div>
  );
});

export default function Staff({ store, db, setDb, ur, openRoles, openDepts, openVacation }) {
  const { empName } = useDataHelpers(db);
  const { showToast } = useToast();
  const { prompt } = useConfirm();
  const [showFired, setShowFired] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { filters, setFilter } = useFilters(INITIAL_FILTERS);
  const { query } = filters;

  // Загрузка по плановым часам активных задач - считаем один проход
  // по всем задачам. Результат передаём в строки примитивами (plan, cnt),
  // поэтому React.memo в EmployeeRow пропускает строки, у которых числа
  // не изменились. Раньше каждая строка звала getEmployeeLoad с фильтром
  // по всему массиву задач - это было O(n_employees × n_tasks) и плюс
  // сбивало мемо: колбэк пересоздавался при каждом изменении задач.
  const loadByEmp = useMemo(() => {
    const map = new Map();
    for (const t of db.tasks) {
      if (t.archived || !t.assigneeId) continue;
      if (t.status === 'closed' || t.status === 'cancelled') continue;
      let cur = map.get(t.assigneeId);
      if (!cur) {
        cur = { plan: 0, cnt: 0 };
        map.set(t.assigneeId, cur);
      }
      cur.plan += t.plannedHours || 0;
      cur.cnt += 1;
    }
    return map;
  }, [db.tasks]);

  // Текущий отпуск сотрудника (approved и сегодня внутри [start, end]).
  // Первый подходящий - как в исходном .find(). Наружу отдаём только
  // end-дату (string | null): этого достаточно для бейджа и это даёт
  // стабильный примитивный проп.
  const vacationEndByEmp = useMemo(() => {
    const map = new Map();
    for (const v of db.vacations) {
      if (v.status !== 'approved') continue;
      if (!(v.start <= TODAY && TODAY <= v.end)) continue;
      if (!map.has(v.empId)) map.set(v.empId, v.end);
    }
    return map;
  }, [db.vacations]);

  const filteredActiveEmployees = useMemo(
    () => db.employees.filter(e => !e.fired && matchesQuery(e, query, db)),
    [db, query]
  );

  const filteredFiredEmployees = useMemo(
    () => db.employees.filter(e => e.fired && matchesQuery(e, query, db)),
    [db, query]
  );

  const noDeptEmployees = useMemo(() => {
    return filteredActiveEmployees
      .filter(e => e.departments.length === 0 && !e.roles.includes('kb_chief'))
      .sort((a, b) => {
        if (a.roles.includes('director') && !b.roles.includes('director')) return -1;
        if (!a.roles.includes('director') && b.roles.includes('director')) return 1;
        return a.last.localeCompare(b.last);
      });
  }, [filteredActiveEmployees]);

  const deptMap = useMemo(() => {
    const map = new Map();
    db.departments.forEach(d => {
      const members = filteredActiveEmployees.filter(e => e.departments.some(x => x.deptId === d.id));
      if (members.length) map.set(d.id, members);
    });
    return map;
  }, [db.departments, filteredActiveEmployees]);

  const kbSections = useMemo(() => {
    return db.kbs.map(k => {
      const deptsInKb = db.departments.filter(d => d.kbId === k.id);
      const members = filteredActiveEmployees.filter(e => e.departments.some(d => deptsInKb.some(x => x.id === d.deptId)));
      const chiefs = filteredActiveEmployees.filter(e => e.roles.includes('kb_chief') && (e.kbIds || []).includes(k.id));
      if (members.length === 0 && deptsInKb.length === 0 && chiefs.length === 0) return null;
      return { kb: k, deptsInKb, members, chiefs };
    }).filter(Boolean);
  }, [db.kbs, db.departments, filteredActiveEmployees]);

  const deptsWithoutKb = useMemo(() => db.departments.filter(d => d.kbId === null), [db.departments]);

  const allVacs = useMemo(() => {
    const list = db.vacations
      .filter(v => {
        if (!query) return true;
        const emp = db.employees.find(e => e.id === v.empId);
        return emp && matchesQuery(emp, query, db);
      })
      .sort((a, b) => (a.start < b.start ? 1 : -1));
    return list;
  }, [db.vacations, db.employees, db, query]);

  const canFire = canFireEmployee(ur);

  const openEditEmployee = useCallback((id) => setEditEmployeeId(id), []);
  const closeEditEmployee = useCallback(() => setEditEmployeeId(null), []);

  const handleCreateKb = useCallback(async () => {
    const name = await prompt(DIALOGS.createKb);
    if (!name) return;
    setDb((s) => ({
      ...s,
      kbs: [...s.kbs, { id: 'kb_' + Math.random().toString(36).slice(2, 6), name, full: name }],
    }));
    showToast(TOASTS.kbCreated(name), 'success');
  }, [prompt, setDb, showToast]);

  const handleCreateDept = useCallback(async () => {
    const name = await prompt(DIALOGS.createDept);
    if (!name) return;
    setDb((s) => ({
      ...s,
      departments: [...s.departments, { id: 'd_' + Math.random().toString(36).slice(2, 6), name, kbId: null }],
    }));
    showToast(TOASTS.deptCreated(name), 'success');
  }, [prompt, setDb, showToast]);

  // Один хелпер для всех мест рендера строки - единая сигнатура пропсов,
  // чтобы не было рассинхрона между 4 секциями.
  const renderEmployeeRow = (e, deptId, isFired) => (
    <EmployeeRow
      key={e.id}
      employee={e}
      isFired={isFired}
      ur={ur}
      deptId={deptId}
      plan={loadByEmp.get(e.id)?.plan || 0}
      cnt={loadByEmp.get(e.id)?.cnt || 0}
      vacationEnd={vacationEndByEmp.get(e.id) || null}
      openDepts={openDepts}
      openRoles={openRoles}
      store={store}
      canFire={canFire}
      openEditEmployee={openEditEmployee}
    />
  );

  const renderDepartment = (deptId) => {
    const members = deptMap.get(deptId) || [];
    if (!members.length) return null;
    const dept = db.departments.find(d => d.id === deptId);
    if (!dept) return null;
    const headNames = db.employees
      .filter(e => (e.headDeptIds || []).includes(deptId) && !e.fired)
      .map(e => `${e.last} ${e.first[0]}.`)
      .join(', ');
    return (
      <div className="st-dept" key={deptId}>
        <div className="st-dept-head">
          <span className="st-dept-name">{dept.name}</span>
          <span className="mut">руководитель: {headNames || '-'}</span>
          <span className="kcount">{members.length}</span>
        </div>
        {members.map(e => renderEmployeeRow(e, deptId, false))}
      </div>
    );
  };

  return (
    <div className="staff">
      <div className="sec-head">
        <div className="sec-note">Привязку сотрудников к отделам меняют только HR-менеджер, суперадминистратор и генеральный директор. Загрузка - по плановым часам открытых задач, норма 160 ч/мес.</div>
        <div className="sec-actions">
          <SearchBox
            value={query}
            onChange={(v) => setFilter('query', v)}
            placeholder="Поиск по ФИО, должности, отделу…"
            className="staff-search"
          />
          {canEditRoles(ur) && (
            <>
              <button className="btn ghost sm" onClick={handleCreateKb}>
                <Ic d={ICONS.plus} size={13} /> КБ
              </button>
              <button className="btn ghost sm" onClick={handleCreateDept}>
                <Ic d={ICONS.plus} size={13} /> Отдел
              </button>
              {canEditDepartments(ur) && (
                <button className="btn primary sm" onClick={() => setShowCreateModal(true)}>
                  <Ic d={ICONS.plus} size={13} /> Добавить сотрудника
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateEmployeeModal
          store={store}
          ur={ur}
          onClose={() => setShowCreateModal(false)}
          toast={(msg, type) => showToast(msg, type || 'error')}
        />
      )}

      {editEmployeeId && (
        <EditEmployeeModal
          store={store}
          ur={ur}
          employeeId={editEmployeeId}
          onClose={closeEditEmployee}
          toast={(msg, type) => showToast(msg, type || 'error')}
        />
      )}

      {query && filteredActiveEmployees.length === 0 && filteredFiredEmployees.length === 0 && (
        <div className="empty-note p-4">Сотрудников по заданным условиям не найдено</div>
      )}

      {noDeptEmployees.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Руководство</div>
          </div>
          {noDeptEmployees.map(e => renderEmployeeRow(e, null, false))}
        </div>
      )}

      {kbSections.map(({ kb, deptsInKb, chiefs }) => (
        <div className="st-section" key={kb.id}>
          <div className="st-sec-head">
            <div className="st-sec-title">{kb.name}</div>
          </div>
          {chiefs.length > 0 && (
            <div className="st-dept" style={{ borderTop: '1px solid var(--line)' }}>
              {chiefs.map(e => renderEmployeeRow(e, null, false))}
            </div>
          )}
          {deptsInKb.map(d => renderDepartment(d.id))}
        </div>
      ))}

      {deptsWithoutKb.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Отделы и сотрудники вне КБ</div>
            <div className="st-sec-sub">Подразделения прямого подчинения</div>
          </div>
          {deptsWithoutKb.map(d => renderDepartment(d.id))}
        </div>
      )}

      {canManageAllVacations(ur) && allVacs.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Все отпуска</div>
            <button className="btn primary sm" onClick={() => openVacation(null, null)}>
              <Ic d={ICONS.plus} size={13} /> Отпуск сотруднику
            </button>
          </div>
          <div className="p-3">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Отдел</th>
                  <th>Период</th>
                  <th>Тип</th>
                  <th>Делегирование</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {allVacs.map(v => {
                  const e = db.employees.find(x => x.id === v.empId);
                  if (e && e.fired) return null;
                  return (
                    <tr key={v.id}>
                      <td><b>{empName(v.empId)}</b></td>
                      <td>{getPrimaryDeptName(e, db)}</td>
                      <td>{fmtDMY(v.start)} - {fmtDMY(v.end)}</td>
                      <td>{VACATION_TYPES[v.type]}</td>
                      <td>{v.delegation.enabled ? `→ ${empName(v.delegation.subId)}` : '-'}</td>
                      <td><span className={`st-chip ${v.status}`}>
                        {{ pending: 'На утверждении', approved: 'Утверждён', rejected: 'Отклонён' }[v.status]}
                      </span></td>
                      <td>
                        <button className="icon-btn" onClick={() => openVacation(v.id, null)}><Ic d={ICONS.edit} size={14} /></button>
                        <button className="icon-btn danger" onClick={() => { setDb((s) => ({ ...s, vacations: s.vacations.filter(x => x.id !== v.id) })); }}><Ic d={ICONS.trash} size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredFiredEmployees.length > 0 && canFire && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Архив сотрудников (уволенные)</div>
            <button className="btn ghost sm" onClick={() => setShowFired(!showFired)}>
              {showFired ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          {showFired && (
            <div className="st-empty-box">
              {filteredFiredEmployees.map(e => renderEmployeeRow(e, null, true))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}