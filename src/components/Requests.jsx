import React, { useState } from "react";
import { DOMAIN, VACATION_TYPES, ROLES } from "../utils/constants";
import { fmtDMY } from "../utils/date";
import { hasRole, canApproveVacation } from "../utils/permissions";
import { useDataHelpers } from "../hooks";
import { useStore } from "../context/StoreContext";

/**
 * Очередь решений по заявкам и запросам.
 *
 * Все действия идут через store.decideX(...): сервисы сами пишут аудит,
 * уведомляют заявителя и, где нужно, меняют целевую сущность (plannedHours
 * задачи при одобрении запроса часов, роль executor при одобрении
 * регистрации). Вьюха не пишет в setDb, не собирает diff и не вызывает
 * notify* вручную.
 *
 * Причина: те же самые решения, сделанные из другого места (например,
 * из будущего мобильного приложения), должны давать идентичный аудит и
 * уведомления. Вьюха - не место для доменной логики.
 *
 * Ошибки сервиса (идемпотентность, «уже решено») летят как исключения.
 * Тост-контекст сюда не пробрасывается - консоль и ErrorBoundary дадут
 * достаточно информации. Для пользователя этот случай аномальный:
 * интерфейс не даёт дважды нажать на одну кнопку.
 */
export default function Requests({ db, ur, initialTab = 'hours' }) {
  const { store } = useStore();
  const { empName } = useDataHelpers(db);
  const [tab, setTab] = useState(initialTab);

  const tabs = [];
  if (hasRole(ur, 'director', 'admin')) tabs.push(['hours', 'Изменение часов']);
  tabs.push(['vac', 'Делегирование отпусков']);
  tabs.push(['rd', 'Передача ролей']);
  if (hasRole(ur, 'admin')) tabs.push(['reg', 'Заявки на регистрацию']);

  const targetTitleOf = (r) => r.kind === "task"
    ? db.tasks.find(t => t.id === r.targetId)?.title
    : db.projects.find(p => p.id === r.targetId)?.name;

  const decideHours = (r, ok) => store.decideHoursRequest(r.id, ok);
  const decideVac = (v, ok) => store.decideVacation(v.id, ok);
  const decideRD = (r, ok) => store.decideRoleDelegation(r.id, ok);
  const decideReg = (r, ok) => store.decideRegistration(r.id, ok);

  return (
    <div>
      <div className="tabs">
        {tabs.map(([id, l]) => (
          <button key={id} className={"tab" + (tab === id ? " on" : "")} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>

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
                  <td><b>{targetTitleOf(r)}</b></td>
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
          <div className="rep-panel-title">Отпуска с делегированием - на утверждение</div>
          <table className="tbl">
            <thead><tr><th>Сотрудник</th><th>Период</th><th>Замещающий</th><th>Решение</th></tr></thead>
            <tbody>
              {db.vacations.filter(v => v.status === "pending" && canApproveVacation(ur, v, db)).map(v => (
                <tr key={v.id}>
                  <td><b>{empName(v.empId)}</b></td>
                  <td>{fmtDMY(v.start)} - {fmtDMY(v.end)}</td>
                  <td>{v.delegation.enabled ? empName(v.delegation.subId) : '-'}</td>
                  <td>
                    <button className="btn primary sm" onClick={() => decideVac(v, true)}>Утвердить</button>{' '}
                    <button className="btn danger sm" onClick={() => decideVac(v, false)}>Отклонить</button>
                  </td>
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
                  <td>
                    {r.status === "pending" && r.toId === ur.id ? (
                      <>
                        <button className="btn primary sm" onClick={() => decideRD(r, true)}>Принять</button>{' '}
                        <button className="btn danger sm" onClick={() => decideRD(r, false)}>Отклонить</button>
                      </>
                    ) : (
                      <span className={"st-chip " + r.status}>{r.status}</span>
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
                  <td><b>{r.last} {r.first}</b></td>
                  <td>{r.email}@{DOMAIN}</td>
                  <td>
                    {r.status === "pending" ? (
                      <>
                        <button className="btn primary sm" onClick={() => decideReg(r, true)}>Одобрить</button>{' '}
                        <button className="btn danger sm" onClick={() => decideReg(r, false)}>Отклонить</button>
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
    </div>
  );
}