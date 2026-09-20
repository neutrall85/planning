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
import { Select } from "./Select";
import { getPrimaryDeptName, getPositionInDept } from "../utils/helpers";
import { optionsFromMap } from "../utils/selectOptions";

const INITIAL_FILTERS = Object.freeze({
  query: '',
  kbId: 'all',
  deptId: 'all',
  role: 'all',
});

const ROLE_SELECT_OPTIONS = optionsFromMap(ROLES, 'Все роли');

/**
 * Совпадает ли сотрудник поисковой строке.
 *
 * Ищем по ФИО, личной должности и по должностям в отделах (они видны
 * в карточках). Названия отделов тоже учитываются - пользователь может
 * искать «аэродинамики».
 *
 * departmentsById - предварительно построенный Map<id, department>.
 * Раньше здесь был db.departments.find(...) внутри цикла по всем
 * сотрудникам: O(n_employees × n_departments) на каждый вызов, а
 * вызов идёт три раза (active / fired / vacations).
 */
const matchesQuery = (emp, q, departmentsById) => {
  if (!q) return true;
  const needle = q.toLowerCase();
  if (`${emp.last} ${emp.first}`.toLowerCase().includes(needle)) return true;
  if ((emp.position || '').toLowerCase().includes(needle)) return true;

  const deptText = (emp.departments || [])
    .map(d => {
      const name = departmentsById.get(d.deptId)?.name || '';
      const pos = d.position || '';
      return `${name} ${pos}`;
    })
    .join(' ')
    .toLowerCase();

  return deptText.includes(needle);
};

/**
 * Единый предикат: поиск + три фильтра. Один на все три списка
 * (активные, уволенные, отпуска) - чтобы фильтр не разъехался между
 * секциями.
 *
 * Каждый из фильтров КБ и отдела имеет четыре состояния:
 *   'all'  - не фильтровать;
 *   'any'  - только те, у кого есть КБ / отдел;
 *   'none' - только те, у кого нет;
 *   <id>   - конкретный.
 *
 * 'all' и 'any' - разные вещи: 'all' не накладывает ограничений,
 * 'any' требует наличия привязки. Это нужно, чтобы «Все сотрудники»
 * (весь штат) и «Все КБ» (только те, кто реально в КБ) различались.
 */
const matchesFilters = (emp, filters, departmentsById) => {
  const { query, kbId, deptId, role } = filters;
  const empDepts = emp.departments || [];

  if (role !== 'all' && !(emp.roles || []).includes(role)) return false;

  if (deptId === 'any') {
    if (empDepts.length === 0) return false;
  } else if (deptId === 'none') {
    if (empDepts.length > 0) return false;
  } else if (deptId !== 'all') {
    if (!empDepts.some(d => d.deptId === deptId)) return false;
  }

  if (kbId !== 'all') {
    const inAnyKb = empDepts.some(d => departmentsById.get(d.deptId)?.kbId);
    const isAnyKbChief = (emp.kbIds || []).length > 0;

    if (kbId === 'any') {
      if (!inAnyKb && !isAnyKbChief) return false;
    } else if (kbId === 'none') {
      if (inAnyKb || isAnyKbChief) return false;
    } else {
      const inKbDept = empDepts.some(d => departmentsById.get(d.deptId)?.kbId === kbId);
      const isKbChief = (emp.kbIds || []).includes(kbId);
      if (!inKbDept && !isKbChief) return false;
    }
  }

  return matchesQuery(emp, query, departmentsById);
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
 * memo-компонент: правка чужой задачи/отпуска не пересоздаёт пропсы
 * этой строки. Всё, что передаётся снаружи, - примитивы или стабильные
 * ссылки (employee, store, колбэки).
 */
const EmployeeRow = React.memo(({
  employee,
  isFired,
  ur,
  deptId,
  vacationEnd,
  openDepts,
  openRoles,
  store,
  canFire,
  openEditEmployee,
}) => {
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
          <span
            key={r}
            className="role-chip"
            title={ROLES[r].label}
            style={{ background: ROLES[r].color + '1e', color: ROLES[r].color }}
          >
            {ROLES[r].short}
          </span>
        ))}
      </div>

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
  const { query, kbId, deptId, role } = filters;

  const departmentsById = useMemo(
    () => new Map(db.departments.map(d => [d.id, d])),
    [db.departments]
  );

  // Опции КБ: четыре состояния - «Все сотрудники» (не фильтровать),
  // «Все КБ» (только те, кто в каком-то КБ), конкретные КБ и «Вне КБ».
  // Новый КБ, добавленный через handleCreateKb, автоматически появится
  // в списке: он попадает в db.kbs, memo пересчитается.
  const kbSelectOptions = useMemo(() => [
    { value: 'all',  label: 'Все сотрудники' },
    { value: 'any',  label: 'Все КБ' },
    ...db.kbs.map(k => ({ value: k.id, label: k.name })),
    { value: 'none', label: 'Вне КБ' },
  ], [db.kbs]);

  // Опции отделов: аналогично - «Все сотрудники», «Все отделы»,
  // конкретные отделы и «Вне отделов». Новый отдел, добавленный через
  // handleCreateDept, появится автоматически.
  const deptSelectOptions = useMemo(() => [
    { value: 'all',  label: 'Все сотрудники' },
    { value: 'any',  label: 'Все отделы' },
    ...db.departments.map(d => ({ value: d.id, label: d.name })),
    { value: 'none', label: 'Вне отделов' },
  ], [db.departments]);

  // Текущий отпуск сотрудника (approved и сегодня внутри [start, end]).
  // Первый подходящий. Наружу - только end-дата (string | null).
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
    () => db.employees.filter(e => !e.fired && matchesFilters(e, filters, departmentsById)),
    [db.employees, filters, departmentsById]
  );

  const filteredFiredEmployees = useMemo(
    () => db.employees.filter(e => e.fired && matchesFilters(e, filters, departmentsById)),
    [db.employees, filters, departmentsById]
  );

  // Секция «Руководство»: активные сотрудники без отдела и без роли
  // главного конструктора. Директор - без отдела, с ролью director;
  // ГК КБ - без отдела, но с ролью kb_chief (они рендерятся внутри
  // секций своих КБ).
  const noDeptEmployees = useMemo(() => {
    return filteredActiveEmployees
      .filter(e => e.departments.length === 0 && !e.roles.includes('kb_chief'))
      .sort((a, b) => {
        if (a.roles.includes('director') && !b.roles.includes('director')) return -1;
        if (!a.roles.includes('director') && b.roles.includes('director')) return 1;
        return a.last.localeCompare(b.last);
      });
  }, [filteredActiveEmployees]);

  // Карта «отдел → сотрудники этого отдела» после фильтрации.
  // Используется как основа для рендера секций и как фильтр «остался
  // ли кто-то в отделе». Один проход по отделам, не по сотрудникам.
  const deptMap = useMemo(() => {
    const map = new Map();
    db.departments.forEach(d => {
      const members = filteredActiveEmployees.filter(e =>
        e.departments.some(x => x.deptId === d.id)
      );
      if (members.length) map.set(d.id, members);
    });
    return map;
  }, [db.departments, filteredActiveEmployees]);

  /**
   * Секции по КБ.
   *
   * members - все сотрудники этого КБ, попавшие под фильтр: нужны
   * только как «есть ли что показывать в секции КБ». Сами они
   * распределяются по отделам через deptMap.
   *
   * deptsInKb - какие отделы рендерить внутри секции КБ. Если фильтр
   * отдела сужен до конкретного, показывается только он. Иначе при
   * фильтре «Отдел аэродинамики» сотрудник, числящийся в двух отделах,
   * всплывал бы и во втором - потому что deptMap содержит его в обоих,
   * а рендер шёл по всем отделам КБ.
   *
   * chiefs - главные конструкторы этого КБ. У них нет отдела, поэтому
   * они попадают под фильтр отдела только как 'none'.
   *
   * Секция показывается, только если в ней есть хоть кто-то: члены
   * отделов КБ или главный конструктор. deptsInKb (статический список
   * отделов КБ) в условии не участвует - он не зависит от фильтра.
   */
  const kbSections = useMemo(() => {
    return db.kbs.map(k => {
      const allDeptsInKb = db.departments.filter(d => d.kbId === k.id);
      const deptsInKb = deptId === 'all'
        ? allDeptsInKb
        : deptId === 'none'
          ? []
          : allDeptsInKb.filter(d => d.id === deptId);

      const members = filteredActiveEmployees.filter(e =>
        e.departments.some(d => allDeptsInKb.some(x => x.id === d.deptId))
      );
      const chiefs = filteredActiveEmployees.filter(e =>
        e.roles.includes('kb_chief') && (e.kbIds || []).includes(k.id)
      );

      if (members.length === 0 && chiefs.length === 0) return null;
      return { kb: k, deptsInKb, members, chiefs };
    }).filter(Boolean);
  }, [db.kbs, db.departments, filteredActiveEmployees, deptId]);

  /**
   * Отделы вне КБ - те, где после фильтрации остались сотрудники.
   * Если фильтр отдела сужен до конкретного, показывается только он.
   * Случай deptId === 'none' сюда не доходит: при нём все сотрудники
   * без отделов, deptMap пуст, условие выше отсекает всё.
   */
  const deptsWithoutKb = useMemo(() => {
    return db.departments.filter(d => {
      if (d.kbId !== null) return false;
      if ((deptMap.get(d.id) || []).length === 0) return false;
      if (deptId === 'all') return true;
      return d.id === deptId;
    });
  }, [db.departments, deptMap, deptId]);

  // Все отпуска - под теми же фильтрами, что и списки сотрудников.
  // Иначе выбор «КБ «ЛА»» показывал бы отпуска всего завода.
  const allVacs = useMemo(() => {
    const list = db.vacations
      .filter(v => {
        const emp = db.employees.find(e => e.id === v.empId);
        return emp && matchesFilters(emp, filters, departmentsById);
      })
      .sort((a, b) => (a.start < b.start ? 1 : -1));
    return list;
  }, [db.vacations, db.employees, filters, departmentsById]);

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
    const dept = departmentsById.get(deptId);
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
      {/* Одна строка: поиск + 3 фильтра + кнопки действий.
          Используем .toolbar - у него уже есть flex-wrap: nowrap и
          правило .toolbar .filter-select { width: 150px }. Классы
          staff-kb-select / staff-dept-select расширяют эти два
          селекта до 220/260px: в них бывают длинные метки. Кнопки
          прижаты вправо через ml-auto на обёртке. */}
      <div className="toolbar">
        <SearchBox
          value={query}
          onChange={(v) => setFilter('query', v)}
          placeholder="Поиск по ФИО, должности, отделу…"
          className="staff-search"
        />
        <Select
          className="filter-select staff-select"
          value={kbId}
          onChange={(v) => setFilter('kbId', v)}
          options={kbSelectOptions}
        />
        <Select
          className="filter-select staff-select"
          value={deptId}
          onChange={(v) => setFilter('deptId', v)}
          options={deptSelectOptions}
        />
        <Select
          className="filter-select"
          value={role}
          onChange={(v) => setFilter('role', v)}
          options={ROLE_SELECT_OPTIONS}
        />
        {canEditRoles(ur) && (
          <div className="ml-auto flex gap-2">
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
          </div>
        )}
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

      {/* Плашка «не найдено» - если хоть один фильтр активен и нет
          ни одного сотрудника ни в активных, ни в уволенных. */}
      {(query || kbId !== 'all' || deptId !== 'all' || role !== 'all')
        && filteredActiveEmployees.length === 0
        && filteredFiredEmployees.length === 0 && (
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