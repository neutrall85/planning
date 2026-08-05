import React, { useState } from "react";
import { ROLES, VACATION_TYPES } from "../utils/constants";
import { TODAY, fmtDMY, initials, uid } from "../utils/date";
import { canEditDepartments, canEditRoles, canManageAllVacations, hasRole, canFireEmployee } from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers } from "../hooks";

export default function Staff({ db, setDb, ur, openRoles, openDepts, openVacation }) {
  const { getEmployeeLoad, empName, primaryDept } = useDataHelpers(db);
  const norm = 160;
  const [showFired, setShowFired] = useState(false);

  const activeEmployees = db.employees.filter(e => !e.fired);
  const firedEmployees = db.employees.filter(e => e.fired);

  const rowFor = (e, isFired = false) => {
    const l = getEmployeeLoad(e.id);
    const pct = Math.min(100, Math.round((l.plan / norm) * 100));
    const vacNow = db.vacations.find(v => v.empId === e.id && v.status === 'approved' && v.start <= TODAY && TODAY <= v.end);
    return (
      <div className="st-row" key={e.id}>
        <span className="avatar sm">{initials(e.first, e.last)}</span>
        <div className="st-name">
          <div className="st-fio">
            {e.last} {e.first}
            {isFired && <span className="vac-badge" style={{ background: '#fef2f2', color: '#dc2626' }}>Уволен</span>}
            {vacNow && <span className="vac-badge">в отпуске до {fmtDMY(vacNow.end)}</span>}
          </div>
          <div className="st-pos">
            {e.position} · {e.departments.map(d => {
              const dd = db.departments.find(x => x.id === d.deptId);
              return dd ? dd.name + (d.primary ? ' (осн.)' : '') : null;
            }).filter(Boolean).join(', ') || 'без отдела'}
          </div>
        </div>
        <div className="st-roles">
          {e.roles.map(r => (
            <span key={r} className="role-chip" style={{ background: ROLES[r].color + '1e', color: ROLES[r].color }}>{ROLES[r].short}</span>
          ))}
          {e.roles.includes('kb_chief') && (e.kbIds || []).map(k => (
            <span key={k} className="role-chip" style={{ background: '#e0f2fe', color: '#0369a1' }}>{db.kbs.find(x => x.id === k)?.name}</span>
          ))}
          {e.roles.includes('head') && (e.headDeptIds || []).map(d => (
            <span key={d} className="role-chip" style={{ background: '#eff6ff', color: '#1d4ed8' }}>{db.departments.find(x => x.id === d)?.name}</span>
          ))}
        </div>
        {!isFired && (
          <div className="st-load">
            <div className="st-load-bar"><div className={`st-load-fill${l.plan > norm ? ' over' : ''}`} style={{ width: pct + '%' }} /></div>
            <span className={`st-load-txt${l.plan > norm ? ' over' : ''}`}>{l.plan} ч · {Math.round((l.plan / norm) * 100)}%</span>
          </div>
        )}
        <div className="st-nums"><b>{isFired ? '—' : l.cnt}</b><span>{isFired ? 'задач' : 'задач'}</span></div>
        {canEditDepartments(ur) && !isFired && <button className="btn ghost sm" title="Подразделения" onClick={() => openDepts(e.id)}><Ic d={ICONS.users} size={13} /> Отделы</button>}
        {canEditRoles(ur) && !isFired && <button className="btn ghost sm" onClick={() => openRoles(e.id)}><Ic d={ICONS.shield} size={13} /> Роли</button>}
        {canFireEmployee(ur) && (
          <button className={`btn ghost sm${isFired ? '' : ' danger'}`} onClick={() => {
            const updated = { ...e, fired: !e.fired };
            setDb((s) => ({ ...s, employees: s.employees.map(emp => emp.id === e.id ? updated : emp) }));
            // Добавляем аудит
            setDb((prev) => ({
              ...prev,
              audit: [{ id: uid(), ts: Date.now(), userId: ur.id, action: e.fired ? 'Восстановление сотрудника' : 'Увольнение сотрудника', details: `${e.last} ${e.first}` }, ...prev.audit]
            }));
          }}>
            <Ic d={isFired ? ICONS.restore : ICONS.x} size={13} /> {isFired ? 'Восстановить' : 'Уволить'}
          </button>
        )}
      </div>
    );
  };

  const deptsBlock = (deptList, employees) => deptList.map(d => {
    const members = employees.filter(e => e.departments.some(x => x.deptId === d.id) && !e.fired);
    if (!members.length) return null;
    const headNames = db.employees.filter(e => (e.headDeptIds || []).includes(d.id) && !e.fired).map(e => `${e.last} ${e.first[0]}.`).join(', ');
    return (
      <div className="st-dept" key={d.id}>
        <div className="st-dept-head">
          <span className="st-dept-name">{d.name}</span>
          <span className="mut">руководитель: {headNames || '—'}</span>
          <span className="kcount">{members.length}</span>
        </div>
        {members.map(e => rowFor(e))}
      </div>
    );
  });

  const allVacs = [...db.vacations].sort((a,b) => (a.start < b.start ? 1 : -1));

  return (
    <div className="staff">
      <div className="sec-head">
        <div className="sec-note">Привязку сотрудников к отделам меняют только HR-менеджер, суперадминистратор и генеральный директор. Загрузка — по плановым часам открытых задач, норма 160 ч/мес.</div>
        {canEditRoles(ur) && (
          <div className="sec-actions">
            <button className="btn ghost sm" onClick={() => {
              const name = window.prompt('Название нового КБ:');
              if (name) {
                setDb((s) => ({ ...s, kbs: [...s.kbs, { id: 'kb_' + Math.random().toString(36).slice(2,6), name, full: name }] }));
              }
            }}><Ic d={ICONS.plus} size={13} /> КБ</button>
            <button className="btn ghost sm" onClick={() => {
              const name = window.prompt('Название нового отдела:');
              if (name) setDb((s) => ({ ...s, departments: [...s.departments, { id: 'd_' + Math.random().toString(36).slice(2,6), name, kbId: null }] }));
            }}><Ic d={ICONS.plus} size={13} /> Отдел</button>
          </div>
        )}
      </div>

      {db.kbs.map(k => (
        <div className="st-section" key={k.id}>
          <div className="st-sec-head">
            <div className="st-sec-title">{k.name}</div>
            <div className="st-sec-sub">
              {k.full} · главный конструктор: {db.employees.filter(e => e.roles.includes('kb_chief') && e.kbIds.includes(k.id) && !e.fired).map(e => `${e.last} ${e.first}`).join(', ') || '—'}
            </div>
          </div>
          {deptsBlock(db.departments.filter(d => d.kbId === k.id), activeEmployees)}
        </div>
      ))}

      <div className="st-section">
        <div className="st-sec-head">
          <div className="st-sec-title">Отделы вне КБ</div>
          <div className="st-sec-sub">Подразделения прямого подчинения</div>
        </div>
        {deptsBlock(db.departments.filter(d => d.kbId === null), activeEmployees)}
      </div>

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

      {/* Архив сотрудников */}
      {firedEmployees.length > 0 && canFireEmployee(ur) && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Архив сотрудников (уволенные)</div>
            <button className="btn ghost sm" onClick={() => setShowFired(!showFired)}>
              {showFired ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          {showFired && (
            <div style={{ padding: 14 }}>
              {firedEmployees.map(e => rowFor(e, true))}
              {firedEmployees.length === 0 && <div className="mut sm" style={{ padding: 12 }}>В архиве нет уволенных сотрудников</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}