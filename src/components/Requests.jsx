import React, { useState } from "react";
import { TASK_STATUSES, VACATION_TYPES, ROLES } from "../utils/constants";
import { fmtDMY, fmtDT } from "../utils/date";
import { hasRole, canApproveVacation } from "../utils/permissions";
import { Ic, ICONS } from "./Icons";
import { useDataHelpers } from "../hooks";

export default function Requests({ db, setDb, ur, initialTab = 'hours', addAudit }) {
  const { empName } = useDataHelpers(db);
  const [tab, setTab] = useState(initialTab);

  const tabs = [];
  if (hasRole(ur, 'director', 'admin')) tabs.push(['hours', 'Изменение часов']);
  tabs.push(['vac', 'Делегирование отпусков']);
  tabs.push(['rd', 'Передача ролей']);
  if (hasRole(ur, 'admin')) tabs.push(['reg', 'Заявки на регистрацию']);

  const decideHours = (r, ok) => {
    setDb((s) => {
      const st = { ...s, hoursRequests: s.hoursRequests.map((x) => (x.id === r.id ? { ...x, status: ok ? "approved" : "rejected" } : x)) };
      if (ok) {
        if (r.kind === "task") st.tasks = st.tasks.map((t) => (t.id === r.targetId ? { ...t, plannedHours: r.newH } : t));
        else st.projects = st.projects.map((p) => (p.id === r.targetId ? { ...p, budget: r.newH } : p));
        const targetTitle = r.kind === "task" 
          ? s.tasks.find(t => t.id === r.targetId)?.title 
          : s.projects.find(p => p.id === r.targetId)?.name;
        addAudit('Утверждение запроса часов', { task: targetTitle, newHours: r.newH }, 'hoursRequest', r.id);
      } else {
        const targetTitle = r.kind === "task" 
          ? s.tasks.find(t => t.id === r.targetId)?.title 
          : s.projects.find(p => p.id === r.targetId)?.name;
        addAudit('Отклонение запроса часов', { task: targetTitle }, 'hoursRequest', r.id);
      }
      return st;
    });
  };

  const decideVac = (v, ok) => {
    setDb((s) => {
      const updated = { ...s, vacations: s.vacations.map((x) => (x.id === v.id ? { ...x, status: ok ? "approved" : "rejected" } : x)) };
      if (ok) {
        addAudit('Утверждение отпуска', { employee: empName(v.empId), period: `${fmtDMY(v.start)}—${fmtDMY(v.end)}` }, 'vacation', v.id);
      } else {
        addAudit('Отклонение отпуска', { employee: empName(v.empId), period: `${fmtDMY(v.start)}—${fmtDMY(v.end)}` }, 'vacation', v.id);
      }
      return updated;
    });
  };

  const decideRD = (r, ok) => {
    setDb((s) => {
      const updated = { ...s, roleDelegations: s.roleDelegations.map((x) => (x.id === r.id ? { ...x, status: ok ? "active" : "rejected" } : x)) };
      if (ok) {
        addAudit('Принятие делегирования', { from: empName(r.fromId), to: empName(r.toId), roles: r.roles.join(', ') }, 'delegation', r.id);
      } else {
        addAudit('Отклонение делегирования', { from: empName(r.fromId), to: empName(r.toId), roles: r.roles.join(', ') }, 'delegation', r.id);
      }
      return updated;
    });
  };

  const decideReg = (r, ok) => {
    if (ok) {
      setDb((s) => {
        const existing = s.employees.find(e => e.email === r.email);
        if (existing) {
          const updated = { ...existing, roles: ['executor'] };
          addAudit('Одобрение регистрации', { email: r.email, employee: `${r.last} ${r.first}` }, 'registration', r.id);
          return { 
            ...s, 
            employees: s.employees.map(e => e.id === updated.id ? updated : e),
            regRequests: s.regRequests.map(x => x.id === r.id ? { ...x, status: "approved" } : x)
          };
        } else {
          const newEmp = { 
            id: "e_" + Math.random().toString(36).slice(2,6),
            last: r.last,
            first: r.first,
            email: r.email,
            pass: r.pass,
            position: "Сотрудник",
            departments: [],
            roles: ["executor"],
            kbIds: [],
            headDeptIds: [],
            phone: "",
            tab: String(1000 + Math.floor(Math.random() * 8999)),
            notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
            failed: 0,
            lockUntil: 0
          };
          addAudit('Одобрение регистрации', { email: r.email, employee: `${r.last} ${r.first}` }, 'registration', r.id);
          return { 
            ...s, 
            employees: [...s.employees, newEmp],
            regRequests: s.regRequests.map(x => x.id === r.id ? { ...x, status: "approved" } : x)
          };
        }
      });
    } else {
      setDb((s) => {
        addAudit('Отклонение регистрации', { email: r.email, employee: `${r.last} ${r.first}` }, 'registration', r.id);
        return { ...s, regRequests: s.regRequests.map((x) => (x.id === r.id ? { ...x, status: "rejected" } : x)) };
      });
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
            <thead><tr><th>От</th><th>Кому</th><th>Роли</th><th>Статус / действие</th></tr></thead>
            <tbody>
              {db.roleDelegations.map(r => (
                <tr key={r.id}>
                  <td>{empName(r.fromId)}</td><td>{empName(r.toId)}</td>
                  <td>{r.roles.map(x => ROLES[x].label).join(", ")}</td>
                  <td>{r.status === "pending" && r.toId === ur.id ? (<><button className="btn primary sm" onClick={() => decideRD(r, true)}>Принять</button> <button className="btn danger sm" onClick={() => decideRD(r, false)}>Отклонить</button></>) : <span className={"st-chip " + r.status}>{r.status}</span>}</td>
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
                  <td><b>{r.last} {r.first}</b></td><td>{r.email}@aeroplan.ru</td>
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