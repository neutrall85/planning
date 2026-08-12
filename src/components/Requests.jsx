import React, { useState } from "react";
import { TASK_STATUSES, VACATION_TYPES, ROLES } from "../utils/constants";
import { fmtDMY, fmtDT } from "../utils/date";
import { hasRole, canApproveVacation } from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers } from "../hooks";

export default function Requests({ db, store, ur, initialTab = 'hours', addAudit }) {
  const { empName } = useDataHelpers(db);
  const [tab, setTab] = useState(initialTab);

  const tabs = [];
  if (hasRole(ur, 'director', 'admin')) tabs.push(['hours', 'Изменение часов']);
  tabs.push(['vac', 'Делегирование отпусков']);
  tabs.push(['rd', 'Передача ролей']);
  if (hasRole(ur, 'admin')) tabs.push(['reg', 'Заявки на регистрацию']);

  const decideHours = (r, ok) => {
    const targetTitle = ok 
      ? (r.kind === "task" 
          ? db.tasks.find(t => t.id === r.targetId)?.title 
          : db.projects.find(p => p.id === r.targetId)?.name)
      : (r.kind === "task" 
          ? db.tasks.find(t => t.id === r.targetId)?.title 
          : db.projects.find(p => p.id === r.targetId)?.name);
    
    // Используем публичный API store вместо прямой мутации setDb
    if (ok) {
      if (r.kind === "task") {
        const task = db.tasks.find(t => t.id === r.targetId);
        if (task) store.upsertTask({ ...task, plannedHours: r.newH });
      } else {
        const project = db.projects.find(p => p.id === r.targetId);
        if (project) store.upsertProject({ ...project, budget: r.newH });
      }
    }
    // Обновляем статус запроса через публичный метод
    if (store && typeof store.updateHoursRequest === 'function') {
      store.updateHoursRequest(r.id, ok ? "approved" : "rejected");
    } else {
      store.setData({
        ...db,
        hoursRequests: db.hoursRequests.map((x) => (x.id === r.id ? { ...x, status: ok ? "approved" : "rejected" } : x))
      });
    }
    
    setTimeout(() => {
      if (ok) {
        addAudit('Утверждение запроса часов', { task: targetTitle, previousHours: r.oldH, newHours: r.newH, reason: r.reason || 'Не указана' }, 'hoursRequest', r.id);
      } else {
        addAudit('Отклонение запроса часов', { task: targetTitle, requestedHours: r.newH, reason: r.reason }, 'hoursRequest', r.id);
      }
    }, 0);
  };

  const decideVac = (v, ok) => {
    const employeeName = empName(v.empId);
    const period = `${fmtDMY(v.start)}—${fmtDMY(v.end)}`;
    
    // Используем публичный API store
    store.approveVacation(v.id, ok);
    
    setTimeout(() => {
      if (ok) {
        addAudit('Утверждение отпуска', { employee: employeeName, period, type: VACATION_TYPES[v.type]?.label || v.type }, 'vacation', v.id);
      } else {
        addAudit('Отклонение отпуска', { employee: employeeName, period, type: VACATION_TYPES[v.type]?.label || v.type }, 'vacation', v.id);
      }
    }, 0);
  };

  const decideRD = (r, ok) => {
    const fromName = empName(r.fromId);
    const toName = empName(r.toId);
    const rolesStr = r.roles.join(', ');
    
    // Используем публичный API store
    store.approveRoleDelegation(r.id, ok);
    
    setTimeout(() => {
      if (ok) {
        addAudit('Принятие делегирования', { from: fromName, to: toName, roles: rolesStr, start: fmtDMY(r.start), end: fmtDMY(r.end) }, 'delegation', r.id);
      } else {
        addAudit('Отклонение делегирования', { from: fromName, to: toName, roles: rolesStr }, 'delegation', r.id);
      }
    }, 0);
  };

  const decideReg = (r, ok) => {
    const empNameStr = `${r.last} ${r.first}`;
    
    // Используем публичный API store
    store.approveRegistration(r.id, ok);
    
    if (ok) {
      setTimeout(() => {
        addAudit('Одобрение регистрации', { email: r.email, employee: empNameStr, position: r.position || 'Сотрудник' }, 'registration', r.id);
      }, 0);
    } else {
      setTimeout(() => {
        addAudit('Отклонение регистрации', { email: r.email, employee: empNameStr, reason: r.rejectionReason || 'Не указана' }, 'registration', r.id);
      }, 0);
    }
  };

  return (
    <div>
      <div className="tabs">{tabs.map(([id, l]) => <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>{l}</button>)}</div>

      {tab === "hours" && hasRole(ur, "director", "admin") && (
        <div className="rep-panel">
          <div className="rep-panel-title">Запросы на изменение плановых часов</div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Объект</th>
                <th>Текущее</th>
                <th>Предлагаемое</th>
                <th>Обоснование</th>
                <th>Запросил</th>
                <th>Решение</th>
              </tr>
            </thead>
            <tbody>
              {db.hoursRequests.map(r => (
                <tr key={r.id}>
                  <td><b>{r.kind === "task" ? db.tasks.find(t => t.id === r.targetId)?.title : db.projects.find(p => p.id === r.targetId)?.name}</b></td>
                  <td>{r.oldH} ч</td>
                  <td><b>{r.newH} ч</b></td>
                  <td className="mut sm">{r.reason}</td>
                  <td>{empName(r.reqId)}</td>
                  <td>
                    {r.status === "pending" ? (
                      <>
                        <button className="btn primary sm" onClick={() => decideHours(r, true)}>Подтвердить</button>
                        <button className="btn danger sm" onClick={() => decideHours(r, false)}>Отклонить</button>
                      </>
                    ) : (
                      <span className={"st-chip " + (r.status === "approved" ? "approved" : "rejected")}>{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "vac" && (
        <div className="rep-panel">
          <div className="rep-panel-title">Отпуска с делегированием — на утверждение</div>
          <table className="tbl">
            <thead><tr><th>Сотрудник</th><th>Период</th><th>Замещающий</th><th>Решение</th></tr></thead>
            <tbody>
              {db.vacations.filter(v => v.status === "pending" && canApproveVacation(ur, v, db)).map(v => (
                <tr key={v.id}>
                  <td><b>{empName(v.empId)}</b></td>
                  <td>{fmtDMY(v.start)} — {fmtDMY(v.end)}</td>
                  <td>{v.delegation.enabled ? empName(v.delegation.subId) : '—'}</td>
                  <td><button className="btn primary sm" onClick={() => decideVac(v, true)}>Утвердить</button> <button className="btn danger sm" onClick={() => decideVac(v, false)}>Отклонить</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "rd" && (
        <div className="rep-panel">
          <div className="rep-panel-title">Передача ролей</div>
          <table className="tbl">
            <thead><tr><th>От</th><th>Кому</th><th>Роли</th><th>Период</th><th>Статус / действие</th></tr></thead>
            <tbody>
              {db.roleDelegations.map(r => (
                <tr key={r.id}>
                  <td>{empName(r.fromId)}</td>
                  <td>{empName(r.toId)}</td>
                  <td>{r.roles.map(x => ROLES[x].label).join(", ")}</td>
                  <td>{fmtDMY(r.start)} — {r.end ? fmtDMY(r.end) : 'до отмены'}</td>
                  <td>
                    {r.status === "pending" && r.toId === ur.id ? (
                      <>
                        <button className="btn primary sm" onClick={() => decideRD(r, true)}>Принять</button>
                        <button className="btn danger sm" onClick={() => decideRD(r, false)}>Отклонить</button>
                      </>
                    ) : r.status === "active" && r.fromId === ur.id ? (
                      <button 
                        className="btn ghost sm"
                        onClick={() => {
                          if (window.confirm('Отозвать делегирование ролей?')) {
                            store.revokeRoleDelegation(r.id);
                          }
                        }}
                      >
                        Отозвать
                      </button>
                    ) : (
                      <span className={"st-chip " + r.status}>
                        {{ pending: 'Ожидает принятия', active: 'Активно', rejected: 'Отклонено', revoked: 'Отозвано', expired: 'Истекло' }[r.status]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "reg" && hasRole(ur, "admin") && (
        <div className="rep-panel">
          <div className="rep-panel-title">Заявки на регистрацию</div>
          <table className="tbl">
            <thead><tr><th>ФИО</th><th>E-mail</th><th>Решение</th></tr></thead>
            <tbody>
              {db.regRequests.map(r => (
                <tr key={r.id}>
                  <td><b>{r.last} {r.first}</b></td><td>{r.email}@volga-dnepr.com</td>
                  <td>{r.status === "pending" ? (<><button className="btn primary sm" onClick={() => decideReg(r, true)}>Одобрить</button> <button className="btn danger sm" onClick={() => decideReg(r, false)}>Отклонить</button></>) : <span className={"st-chip " + (r.status === "approved" ? "approved" : "rejected")}>{r.status}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}