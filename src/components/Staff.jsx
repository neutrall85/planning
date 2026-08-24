import React, { useState, useMemo, useCallback } from "react";
import { ROLES, VACATION_TYPES } from "../utils/constants";
import { TODAY, fmtDMY, initials, uid } from "../utils/date";
import {
  canEditDepartments,
  canEditRoles,
  canManageAllVacations,
  hasRole,
  canFireEmployee,
} from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers } from "../hooks";
import EditEmployeeModal from "./EditEmployeeModal";
import CreateEmployeeModal from "./CreateEmployeeModal";
import Avatar from './Avatar';

// ---- Строка сотрудника ----
const EmployeeRow = React.memo(({
  employee,
  isFired,
  db,
  ur,
  openDepts,
  openRoles,
  setDb,
  canFire,
  getEmployeeLoad,
  empName,
  primaryDept,
  openEditEmployee,
}) => {
  const l = getEmployeeLoad(employee.id);
  const norm = 160;
  const pct = Math.min(100, Math.round((l.plan / norm) * 100));
  const vacNow = db.vacations.find(v => v.empId === employee.id && v.status === 'approved' && v.start <= TODAY && TODAY <= v.end);

  const handleFireToggle = useCallback(() => {
    const updated = { ...employee, fired: !employee.fired };
    setDb((s) => ({
      ...s,
      employees: s.employees.map(emp => emp.id === employee.id ? updated : emp),
      audit: [{ id: uid(), ts: Date.now(), userId: ur.id, action: employee.fired ? 'Восстановление сотрудника' : 'Увольнение сотрудника', details: `${employee.last} ${employee.first}` }, ...s.audit]
    }));
  }, [employee, setDb, ur]);

  // Отображение должностей:
  // - Основная должность (employee.position)
  // - Для каждого совмещаемого отдела (d.primary === false) – его название и его должность (d.position), если задана
  const renderDeptPositions = () => {
    const primaryDept = employee.departments.find(d => d.primary);
    const extraDepts = employee.departments.filter(d => !d.primary);

    // Если нет отделов – ничего не показываем
    if (!primaryDept && extraDepts.length === 0) return null;

    return (
      <>
        {/* Основная должность */}
        {employee.position && <span>{employee.position}</span>}
        {/* Разделитель, если есть совмещаемые отделы */}
        {extraDepts.length > 0 && employee.position && <span style={{ marginLeft: '4px' }}> · </span>}
        {/* Совмещаемые отделы с их должностями */}
        {extraDepts.map(d => {
          const dept = db.departments.find(x => x.id === d.deptId);
          if (!dept) return null;
          const deptPosition = d.position?.trim(); // должность в этом отделе
          return (
            <span key={d.deptId} className="dept-chip">
              {dept.name}
              {deptPosition && `: ${deptPosition}`}
              <span className="mut sm" style={{ marginLeft: '4px' }}>(совм.)</span>
            </span>
          );
        }).filter(Boolean)}
      </>
    );
  };

  return (
    <div className="st-row">
      <Avatar employee={employee} size="sm" />
      <div className="st-name">
        <div className="st-fio">
          {employee.last} {employee.first}
          {isFired && <span className="vac-badge fired">Уволен</span>}
          {vacNow && <span className="vac-badge">в отпуске до {fmtDMY(vacNow.end)}</span>}
        </div>
        <div className="st-pos">
          {renderDeptPositions()}
        </div>
      </div>
      <div className="st-roles">
        {employee.roles.map(r => (
          <span key={r} className="role-chip" style={{ background: ROLES[r].color + '1e', color: ROLES[r].color }}>{ROLES[r].short}</span>
        ))}
      </div>
      {!isFired && (
        <div className="st-load">
          <div className="st-load-bar"><div className={`st-load-fill${l.plan > norm ? ' over' : ''}`} style={{ width: pct + '%' }} /></div>
          <span className={`st-load-txt${l.plan > norm ? ' over' : ''}`}>{l.plan} ч · {Math.round((l.plan / norm) * 100)}%</span>
        </div>
      )}
      <div className="st-nums"><b>{isFired ? '—' : l.cnt}</b><span>{isFired ? 'задач' : 'задач'}</span></div>
      {canEditDepartments(ur) && !isFired && <button className="btn ghost sm" title="Подразделения" onClick={() => openDepts(employee.id)}><Ic d={ICONS.users} size={13} /> Отделы</button>}
      {canEditRoles(ur) && !isFired && <button className="btn ghost sm" onClick={() => openRoles(employee.id)}><Ic d={ICONS.shield} size={13} /> Роли</button>}
      {canEditDepartments(ur) && (
        <button className="icon-btn" title="Редактировать сотрудника" onClick={() => openEditEmployee(employee.id)}>
          <Ic d={ICONS.edit} size={15} />
        </button>
      )}
      {canFire && (
        <button className={`btn ghost sm${isFired ? '' : ' danger'}`} onClick={handleFireToggle}>
          <Ic d={isFired ? ICONS.restore : ICONS.x} size={13} /> {isFired ? 'Восстановить' : 'Уволить'}
        </button>
      )}
    </div>
  );
});

// ---- Основной компонент Staff ----
export default function Staff({ db, setDb, ur, openRoles, openDepts, openVacation }) {
  const { getEmployeeLoad, empName, primaryDept } = useDataHelpers(db);
  const [showFired, setShowFired] = useState(false);
  const [editEmployeeId, setEditEmployeeId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeEmployees = useMemo(() => db.employees.filter(e => !e.fired), [db.employees]);
  const firedEmployees = useMemo(() => db.employees.filter(e => e.fired), [db.employees]);

  const noDeptEmployees = useMemo(() => {
    return activeEmployees
      .filter(e => e.departments.length === 0 && !e.roles.includes('kb_chief'))
      .sort((a, b) => {
        if (a.roles.includes('director') && !b.roles.includes('director')) return -1;
        if (!a.roles.includes('director') && b.roles.includes('director')) return 1;
        return a.last.localeCompare(b.last);
      });
  }, [activeEmployees]);

  const deptMap = useMemo(() => {
    const map = new Map();
    db.departments.forEach(d => {
      const members = activeEmployees.filter(e => e.departments.some(x => x.deptId === d.id));
      if (members.length) map.set(d.id, members);
    });
    return map;
  }, [db.departments, activeEmployees]);

  const kbSections = useMemo(() => {
    return db.kbs.map(k => {
      const deptsInKb = db.departments.filter(d => d.kbId === k.id);
      const members = activeEmployees.filter(e => e.departments.some(d => deptsInKb.some(x => x.id === d.deptId)));
      const chiefs = activeEmployees.filter(e => e.roles.includes('kb_chief') && (e.kbIds || []).includes(k.id));
      if (members.length === 0 && deptsInKb.length === 0 && chiefs.length === 0) return null;
      return { kb: k, deptsInKb, members, chiefs };
    }).filter(Boolean);
  }, [db.kbs, db.departments, activeEmployees]);

  const deptsWithoutKb = useMemo(() => db.departments.filter(d => d.kbId === null), [db.departments]);
  const allVacs = useMemo(() => [...db.vacations].sort((a,b) => (a.start < b.start ? 1 : -1)), [db.vacations]);
  const canFire = canFireEmployee(ur);

  const openEditEmployee = useCallback((id) => setEditEmployeeId(id), []);
  const closeEditEmployee = useCallback(() => setEditEmployeeId(null), []);

  const renderDepartment = useCallback((deptId) => {
    const members = deptMap.get(deptId) || [];
    if (!members.length) return null;
    const dept = db.departments.find(d => d.id === deptId);
    if (!dept) return null;
    const headNames = db.employees.filter(e => (e.headDeptIds || []).includes(deptId) && !e.fired).map(e => `${e.last} ${e.first[0]}.`).join(', ');
    return (
      <div className="st-dept" key={deptId}>
        <div className="st-dept-head">
          <span className="st-dept-name">{dept.name}</span>
          <span className="mut">руководитель: {headNames || '—'}</span>
          <span className="kcount">{members.length}</span>
        </div>
        {members.map(e => (
          <EmployeeRow
            key={e.id}
            employee={e}
            isFired={false}
            db={db}
            ur={ur}
            openDepts={openDepts}
            openRoles={openRoles}
            setDb={setDb}
            canFire={canFire}
            getEmployeeLoad={getEmployeeLoad}
            empName={empName}
            primaryDept={primaryDept}
            openEditEmployee={openEditEmployee}
          />
        ))}
      </div>
    );
  }, [deptMap, db, ur, openDepts, openRoles, setDb, canFire, getEmployeeLoad, empName, primaryDept, openEditEmployee]);

  return (
    <div className="staff">
      <div className="sec-head">
        <div className="sec-note">Привязку сотрудников к отделам меняют только HR-менеджер, суперадминистратор и генеральный директор. Загрузка — по плановым часам открытых задач, норма 160 ч/мес.</div>
        {canEditRoles(ur) && (
          <div className="sec-actions">
            <button className="btn ghost sm" onClick={() => {
              const name = window.prompt('Название нового КБ:');
              if (name) setDb((s) => ({ ...s, kbs: [...s.kbs, { id: 'kb_' + Math.random().toString(36).slice(2,6), name, full: name }] }));
            }}><Ic d={ICONS.plus} size={13} /> КБ</button>
            <button className="btn ghost sm" onClick={() => {
              const name = window.prompt('Название нового отдела:');
              if (name) setDb((s) => ({ ...s, departments: [...s.departments, { id: 'd_' + Math.random().toString(36).slice(2,6), name, kbId: null }] }));
            }}><Ic d={ICONS.plus} size={13} /> Отдел</button>
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
          db={db}
          setDb={setDb}
          onClose={() => setShowCreateModal(false)}
          toast={(msg, type) => alert(msg)}
          audit={(action, details) => setDb(prev => ({ ...prev, audit: [{ id: uid(), ts: Date.now(), userId: ur.id, action, details }, ...prev.audit] }))}
        />
      )}

      {editEmployeeId && (
        <EditEmployeeModal
          db={db}
          setDb={setDb}
          employeeId={editEmployeeId}
          onClose={closeEditEmployee}
          toast={(msg, type) => alert(msg)}
          audit={(action, details) => setDb(prev => ({ ...prev, audit: [{ id: uid(), ts: Date.now(), userId: ur.id, action, details }, ...prev.audit] }))}
          ur={ur}
        />
      )}

      {noDeptEmployees.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Руководство</div>
            <div className="st-sec-sub">{noDeptEmployees.length} чел.</div>
          </div>
          {noDeptEmployees.map(e => (
            <EmployeeRow
              key={e.id}
              employee={e}
              isFired={false}
              db={db}
              ur={ur}
              openDepts={openDepts}
              openRoles={openRoles}
              setDb={setDb}
              canFire={canFire}
              getEmployeeLoad={getEmployeeLoad}
              empName={empName}
              primaryDept={primaryDept}
              openEditEmployee={openEditEmployee}
            />
          ))}
        </div>
      )}

      {kbSections.map(({ kb, deptsInKb, members, chiefs }) => (
        <div className="st-section" key={kb.id}>
          <div className="st-sec-head">
            <div className="st-sec-title">{kb.name}</div>
            <div className="st-sec-sub">{kb.full} · главный конструктор: {chiefs.map(e => `${e.last} ${e.first}`).join(', ') || '—'}</div>
          </div>
          {chiefs.length > 0 && (
            <div className="st-dept" style={{ borderTop: '1px solid var(--line)' }}>
              <div className="st-dept-head">
                <span className="st-dept-name">Главные конструкторы</span>
                <span className="kcount">{chiefs.length}</span>
              </div>
              {chiefs.map(e => (
                <EmployeeRow
                  key={e.id}
                  employee={e}
                  isFired={false}
                  db={db}
                  ur={ur}
                  openDepts={openDepts}
                  openRoles={openRoles}
                  setDb={setDb}
                  canFire={canFire}
                  getEmployeeLoad={getEmployeeLoad}
                  empName={empName}
                  primaryDept={primaryDept}
                  openEditEmployee={openEditEmployee}
                />
              ))}
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

      {canManageAllVacations(ur) && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Все отпуска (управление HR / ГД / суперадминистратор)</div>
            <button className="btn primary sm" onClick={() => openVacation(null, null)}><Ic d={ICONS.plus} size={13} /> Отпуск сотруднику</button>
          </div>
          <div style={{ padding: 14 }}>
            <table className="tbl">
              <thead><tr><th>Сотрудник</th><th>Период</th><th>Тип</th><th>Делегирование</th><th>Статус</th><th></th></tr></thead>
              <tbody>
                {allVacs.map(v => {
                  const e = db.employees.find(x => x.id === v.empId);
                  if (e && e.fired) return null;
                  return (
                    <tr key={v.id}>
                      <td><b>{empName(v.empId)}</b><div className="mut sm">{primaryDept(db.employees.find(e => e.id === v.empId))?.name || ''}</div></td>
                      <td>{fmtDMY(v.start)} — {fmtDMY(v.end)}</td>
                      <td>{VACATION_TYPES[v.type]}</td>
                      <td>{v.delegation.enabled ? `→ ${empName(v.delegation.subId)}` : '—'}</td>
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
                {allVacs.length === 0 && <tr><td colSpan="6" className="mut">Отпусков нет</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {firedEmployees.length > 0 && canFire && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Архив сотрудников (уволенные)</div>
            <button className="btn ghost sm" onClick={() => setShowFired(!showFired)}>
              {showFired ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          {showFired && (
            <div className="st-empty-box">
              {firedEmployees.map(e => (
                <EmployeeRow
                  key={e.id}
                  employee={e}
                  isFired={true}
                  db={db}
                  ur={ur}
                  openDepts={openDepts}
                  openRoles={openRoles}
                  setDb={setDb}
                  canFire={canFire}
                  getEmployeeLoad={getEmployeeLoad}
                  empName={empName}
                  primaryDept={primaryDept}
                  openEditEmployee={openEditEmployee}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}