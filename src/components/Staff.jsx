import React, { useState } from "react";
import { ROLES, VACATION_TYPES } from "../utils/constants";
import { TODAY, fmtDMY, initials, uid } from "../utils/date";
import { canEditDepartments, canEditRoles, canManageAllVacations, hasRole, canFireEmployee } from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { empName, primaryDept, getEmployeeLoad } from '../utils/dataHelpers';
import { Modal } from "./Modal";
import { CreateEmployeeModal } from "./Modals";

export default function Staff({ db, store, ur, openRoles, openDepts, openVacation, openEmployeeEdit }) {
  const norm = 160;
  const [showFired, setShowFired] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const activeEmployees = db.employees.filter(e => !e.fired);
  const firedEmployees = db.employees.filter(e => e.fired);

  // Функция для отрисовки одной строки сотрудника
  // currentDeptId - ID отдела, в котором сейчас отображается сотрудник (если есть)
  const rowFor = (e, isFired = false, currentDeptId = null) => {
    const l = getEmployeeLoad(e.id);
    const pct = Math.min(100, Math.round((l.plan / norm) * 100));
    const vacNow = db.vacations.find(v => v.empId === e.id && v.status === 'approved' && v.start <= TODAY && TODAY <= v.end);
    
    // Получаем количество делегированных задач
    const delegatedCount = e.delegatedTasksCount || 0;
    
    // Определяем статус сотрудника в текущем отделе
    const deptInCurrent = e.departments.find(d => d.deptId === currentDeptId);
    const isSecondaryInCurrent = currentDeptId && deptInCurrent && deptInCurrent.primary !== true;
    const isPrimaryInCurrent = currentDeptId && deptInCurrent && deptInCurrent.primary === true;
    
    // Получаем отделы совмещения (где primary !== true)
    const secondaryDepts = e.departments.filter(d => d.primary !== true);
    const hasSecondary = secondaryDepts.length > 0;
    
    // Получаем должность для текущего отдела
    const positionInCurrent = deptInCurrent?.position || e.position;
    
    return (
      <div className="st-row" key={e.id}>
        <span className="avatar sm">
          {e.photo ? (
            <img src={e.photo} alt="Аватар" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            initials(e.first, e.last)
          )}
        </span>
        <div className="st-name">
          <div className="st-fio">
            {e.last} {e.first}
            {isFired && <span className="vac-badge fired">Уволен</span>}
            {vacNow && <span className="vac-badge">в отпуске до {fmtDMY(vacNow.end)}</span>}
          </div>
          <div className="st-pos">
            {positionInCurrent}
          </div>
        </div>
        <div className="st-roles">
          {e.roles.map(r => (
            <span key={r} className="role-chip" style={{ background: ROLES[r].color + '1e', color: ROLES[r].color }}>{ROLES[r].short}</span>
          ))}
          {/* Плашки КБ у главных конструкторов убраны */}
          {/* Если это отдел совмещения - показываем название отдела с пометкой (совм) */}
          {isSecondaryInCurrent && (
            <span className="sim-badge">(совм)</span>
          )}
          {/* Если это основной отдел и есть совмещения - показываем названия отделов совмещения с должностями под ролями с пометкой (совм) */}
          {isPrimaryInCurrent && hasSecondary && (
            <div className="st-depts-list" style={{ marginTop: '4px' }}>
              <span className="mut sm" style={{ fontSize: '11px' }}>
                {secondaryDepts.map(d => {
                  const deptName = db.departments.find(dept => dept.id === d.deptId)?.name;
                  const deptPosition = d.position || '';
                  return `${deptName}${deptPosition ? ` (${deptPosition})` : ''} (совм)`;
                }).join(', ')}
              </span>
            </div>
          )}
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
            store.updateEmployee(updated);
            store.addAudit(e.fired ? 'Восстановление сотрудника' : 'Увольнение сотрудника', `${e.last} ${e.first}`);
          }}>
            <Ic d={isFired ? ICONS.restore : ICONS.x} size={13} /> {isFired ? 'Восстановить' : 'Уволить'}
          </button>
        )}
        {hasRole(ur, 'admin') && !isFired && (
          <button className="btn ghost sm" title="Редактировать данные сотрудника" onClick={() => openEmployeeEdit(e.id)}>
            <Ic d={ICONS.edit} size={13} />
          </button>
        )}
      </div>
    );
  };

  // Функция для построения блока подразделения
  const deptsBlock = (deptList, employees) => deptList.map(d => {
    // Считаем сотрудников отдела: основные + совмещения
    const membersWithRates = employees.filter(e => e.departments.some(x => x.deptId === d.id) && !e.fired);
    // Подсчёт количества сотрудников (каждый сотрудник считается как 1, независимо от ставки)
    let totalStaffCount = 0;
    membersWithRates.forEach(e => {
      e.departments.forEach(dep => {
        if (dep.deptId === d.id) {
          totalStaffCount += 1;
        }
      });
    });
    
    if (!membersWithRates.length) return null;
    const headNames = db.employees.filter(e => (e.headDeptIds || []).includes(d.id) && !e.fired).map(e => `${e.last} ${e.first[0]}.`).join(', ');
    
    // Сортируем сотрудников: сначала начальники отделов (у кого этот отдел в headDeptIds), затем остальные
    const sortedMembers = [...membersWithRates].sort((a, b) => {
      const aIsHead = (a.headDeptIds || []).includes(d.id);
      const bIsHead = (b.headDeptIds || []).includes(d.id);
      if (aIsHead && !bIsHead) return -1;
      if (!aIsHead && bIsHead) return 1;
      return 0;
    });
    
    return (
      <div className="st-dept" key={d.id}>
        <div className="st-dept-head">
          <span className="st-dept-name">{d.name}</span>
          <span className="mut">руководитель: {headNames || '—'}</span>
          <span className="kcount">{Number.isInteger(totalStaffCount) ? totalStaffCount : totalStaffCount.toFixed(1)}</span>
        </div>
        {sortedMembers.map(e => rowFor(e, false, d.id))}
      </div>
    );
  });

  // Собираем сотрудников без отдела (тех, у кого departments пустой)
  // Оставляем только Генерального директора
  const noDeptEmployees = activeEmployees.filter(e => 
    e.departments.length === 0 && e.roles.includes('director')
  );

  // Сотрудники с отделами только по совмещению (нет primary: true)
  const secondaryOnlyEmployees = activeEmployees.filter(e => 
    e.departments.length > 0 && !e.departments.some(d => d.primary === true)
  );

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
                store.createKb(name, name);
              }
            }}><Ic d={ICONS.plus} size={13} /> КБ</button>
            <button className="btn ghost sm" onClick={() => {
              const name = window.prompt('Название нового отдела:');
              if (name) store.createDepartment(name, null);
            }}><Ic d={ICONS.plus} size={13} /> Отдел</button>
            {hasRole(ur, 'admin') && (
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
          store={store}
          onClose={() => setShowCreateModal(false)}
          toast={(msg, type) => alert(msg)}
          audit={(action, details) => store.addAudit(action, details)}
        />
      )}

      {/* --- СЕКЦИЯ: РУКОВОДСТВО ОРГАНИЗАЦИИ --- */}
      {noDeptEmployees.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Руководство организации</div>
            <div className="st-sec-sub">{noDeptEmployees.length} чел.</div>
          </div>
          {noDeptEmployees.map(e => rowFor(e))}
        </div>
      )}

      {/* --- СЕКЦИЯ: СОТРУДНИКИ ТОЛЬКО ПО СОВМЕЩЕНИЮ --- */}
      {secondaryOnlyEmployees.length > 0 && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Сотрудники по совмещению (без основного отдела)</div>
            <div className="st-sec-sub">{secondaryOnlyEmployees.length} чел.</div>
          </div>
          {secondaryOnlyEmployees.map(e => rowFor(e))}
        </div>
      )}

      {/* --- КБ и отделы --- */}
      {db.kbs.map(k => {
        const deptsInKb = db.departments.filter(d => d.kbId === k.id);
        const membersInKb = activeEmployees.filter(e => e.departments.some(d => deptsInKb.some(x => x.id === d.deptId)));
        // Главные конструкторы этого КБ (они в КБ, но без отделов)
        const chiefsInKb = activeEmployees.filter(e => 
          e.roles.includes('kb_chief') && e.kbIds.includes(k.id)
        );
        if (!membersInKb.length && deptsInKb.length === 0 && chiefsInKb.length === 0) return null;
        return (
          <div className="st-section" key={k.id}>
            <div className="st-sec-head">
              <div className="st-sec-title">{k.name}</div>
              <div className="st-sec-sub">
                {k.full}
              </div>
            </div>
            {/* Отображаем главных конструкторов КБ сразу под названием КБ */}
            {chiefsInKb.length > 0 && chiefsInKb.map(e => rowFor(e))}
            {deptsBlock(deptsInKb, activeEmployees)}
          </div>
        );
      })}

      {/* --- Отделы без КБ --- */}
      {(() => {
        const deptsNoKb = db.departments.filter(d => d.kbId === null);
        
        if (deptsNoKb.length === 0) return null;
        
        return (
          <div className="st-section">
            <div className="st-sec-head">
              <div className="st-sec-title">Отделы вне КБ</div>
              <div className="st-sec-sub">Подразделения прямого подчинения</div>
            </div>
            {deptsBlock(deptsNoKb, activeEmployees)}
          </div>
        );
      })()}

      {/* --- Сотрудники без подразделения (вне КБ) --- */}
      {(() => {
        // Сотрудники без отдела и без КБ (исключая генерального директора, он уже в "Руководство организации")
        const employeesNoDeptNoKb = activeEmployees.filter(e => 
          e.departments.length === 0 && 
          (!e.kbIds || e.kbIds.length === 0) &&
          !e.roles.includes('director')
        );
        
        if (employeesNoDeptNoKb.length === 0) return null;
        
        return (
          <div className="st-section">
            <div className="st-sec-head">
              <div className="st-sec-title">Сотрудники без подразделения</div>
              <div className="st-sec-sub">{employeesNoDeptNoKb.length} чел.</div>
            </div>
            {employeesNoDeptNoKb.map(e => rowFor(e))}
          </div>
        );
      })()}

      {/* --- Все отпуска (для HR/админов) --- */}
      {hasRole(ur, 'admin', 'director', 'hr') && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Все отпуска (управление HR / ГД / суперадминистратор)</div>
            <button className="btn primary sm" onClick={() => openVacation(null, null)}><Ic d={ICONS.plus} size={13} /> Отпуск сотруднику</button>
          </div>
          <div style={{ padding: 14 }}>
            <table className="tbl">
              <thead><tr><th>Сотрудник</th><th>Период</th><th>Тип</th><th>Делегирование</th><th>Статус</th><th>Обоснование</th><th></th></tr></thead>
              <tbody>
                {allVacs.map(v => {
                  const e = db.employees.find(x => x.id === v.empId);
                  if (e && e.fired) return null;
                  const isPending = v.status === 'pending';
                  const canApprove = hasRole(ur, 'director', 'hr', 'admin');
                  return (
                    <tr key={v.id}>
                      <td><b>{empName(v.empId)}</b><div className="mut sm">{primaryDept(db.employees.find(e => e.id === v.empId))?.name || ''}</div></td>
                      <td>{fmtDMY(v.start)} — {fmtDMY(v.end)}</td>
                      <td>{VACATION_TYPES[v.type]}</td>
                      <td>{v.delegation.enabled ? `→ ${empName(v.delegation.subId)}` : '—'}</td>
                      <td><span className={`st-chip ${v.status}`}>
                        {{ pending: 'На утверждении', approved: 'Утверждён', rejected: 'Отклонён' }[v.status]}
                      </span></td>
                      <td className="mut sm" style={{ maxWidth: '200px' }}>
                        {v.justification || '—'}
                      </td>
                      <td>
                        <button className="icon-btn" onClick={() => openVacation(v.id, null)}><Ic d={ICONS.edit} size={14} /></button>
                        {isPending && canApprove && !hasRole(ur, 'admin') && (
                          <>
                            <button 
                              className="icon-btn success" 
                              title="Утвердить"
                              onClick={() => {
                                const justification = window.prompt('Введите обоснование утверждения (необязательно):', '');
                                store.approveVacation(v.id, true, justification || '');
                              }}
                            >
                              <Ic d={ICONS.check} size={14} />
                            </button>
                            <button 
                              className="icon-btn danger" 
                              title="Отклонить"
                              onClick={() => {
                                const justification = window.prompt('Введите обоснование отклонения (обязательно):');
                                if (justification && justification.trim()) {
                                  store.approveVacation(v.id, false, justification.trim());
                                } else if (justification !== null) {
                                  alert('Обоснование отклонения обязательно');
                                }
                              }}
                            >
                              <Ic d={ICONS.x} size={14} />
                            </button>
                          </>
                        )}
                        {/* Удаление: только админ или владелец запроса со статусом pending */}
                        {(hasRole(ur, 'admin') || (v.empId === ur.id && isPending)) && (
                          <button className="icon-btn danger" onClick={() => { store.deleteVacationById(v.id); }}><Ic d={ICONS.trash} size={14} /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {allVacs.length === 0 && <tr><td colSpan="7" className="mut">Отпусков нет</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Архив уволенных --- */}
      {firedEmployees.length > 0 && canFireEmployee(ur) && (
        <div className="st-section">
          <div className="st-sec-head">
            <div className="st-sec-title">Архив сотрудников (уволенные)</div>
            <button className="btn ghost sm" onClick={() => setShowFired(!showFired)}>
              {showFired ? 'Скрыть' : 'Показать'}
            </button>
          </div>
          {showFired && (
            <div className="st-empty-box">
              {firedEmployees.map(e => rowFor(e, true))}
              {firedEmployees.length === 0 && <div className="mut sm st-empty-txt">В архиве нет уволенных сотрудников</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}