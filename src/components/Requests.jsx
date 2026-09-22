import { useCallback, useState } from 'react';
import { DOMAIN, ROLES } from '../utils/constants';
import { fmtDMY } from '../utils/date';
import { hasRole, canApproveVacation } from '../utils/permissions';
import { useDataHelpers } from '../hooks';
import { useStore } from '../context/StoreContext';
import { RejectionReasonModal } from './Modals/RejectionReasonModal';
import { CHANGE_KINDS, CHANGE_KIND_LIST } from '../utils/changeKinds';

/**
 * Очередь решений по заявкам и запросам.
 *
 * Все действия идут через store.decideX(...): сервисы сами пишут аудит,
 * уведомляют заявителя и, где нужно, меняют целевую сущность (plannedHours
 * задачи при одобрении запроса часов, role executor при одобрении
 * регистрации). Вьюха не пишет в setDb, не собирает diff и не вызывает
 * notify* вручную.
 *
 * Запросы на изменение (changeRequests) — единая сущность с полем
 * changeKind. Вкладки строятся из CHANGE_KIND_LIST: новый вид изменения
 * (приоритет, статус) даст новую вкладку без правок этого файла.
 */
export default function Requests({ db, ur, initialTab = 'hours' }) {
  const { store } = useStore();
  const { empName } = useDataHelpers(db);
  const [tab, setTab] = useState(initialTab);
  const [rejecting, setRejecting] = useState(null);

  const canDecideChange = hasRole(ur, 'director', 'admin');

  const tabs = [];
  if (canDecideChange) {
    CHANGE_KIND_LIST.forEach(k => tabs.push([k.id, k.label]));
  }
  tabs.push(['vac', 'Делегирование отпусков']);
  tabs.push(['rd', 'Передача ролей']);
  if (hasRole(ur, 'admin')) tabs.push(['reg', 'Заявки на регистрацию']);

  const targetTitleOf = (r) => r.targetType === 'task'
    ? (db.tasks.find(t => t.id === r.targetId)?.title || '(удалено)')
    : (db.projects.find(p => p.id === r.targetId)?.name || '(удалено)');

  // --- Утверждение: причина не нужна ---
  const decideChange = (r, ok) => store.decideChangeRequest(r.id, ok);
  const decideVac = (v, ok) => store.decideVacation(v.id, ok);
  const decideRD = (r, ok) => store.decideRoleDelegation(r.id, ok);
  const decideReg = (r, ok) => store.decideRegistration(r.id, ok);

  // --- Отклонение: всегда через модалку ---
  const openReject = useCallback((kind, item) => {
    setRejecting({ kind, item });
  }, []);

  const confirmReject = useCallback((reason) => {
    if (!rejecting) return;
    const { kind, item } = rejecting;
    if (CHANGE_KINDS[kind]) store.decideChangeRequest(item.id, false, reason);
    else if (kind === 'vac') store.decideVacation(item.id, false, reason);
    else if (kind === 'rd') store.decideRoleDelegation(item.id, false, reason);
    else if (kind === 'reg') store.decideRegistration(item.id, false, reason);
    setRejecting(null);
  }, [rejecting, store]);

  const closeReject = useCallback(() => setRejecting(null), []);

  const rejectionTitle = (() => {
    if (!rejecting) return 'Причина отклонения';
    if (CHANGE_KINDS[rejecting.kind]) return `Причина отклонения: ${CHANGE_KINDS[rejecting.kind].label.toLowerCase()}`;
    switch (rejecting.kind) {
      case 'vac': return 'Причина отклонения отпуска';
      case 'rd':  return 'Причина отклонения делегирования';
      case 'reg': return 'Причина отклонения регистрации';
      default:    return 'Причина отклонения';
    }
  })();

  const renderChangeKindTab = (kindId) => {
    const kind = CHANGE_KINDS[kindId];
    const items = (db.changeRequests || []).filter(r => r.changeKind === kindId);
    return (
      <div className="rep-panel">
        <div className="rep-panel-title">Запросы: {kind.label.toLowerCase()}</div>
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
            {items.length === 0 && (
              <tr>
                <td colSpan="6" className="mut text-center">Запросов нет</td>
              </tr>
            )}
            {items.map(r => (
              <tr key={r.id}>
                <td><b>{targetTitleOf(r)}</b></td>
                <td>{kind.formatValue(r.oldValue)}</td>
                <td><b>{kind.formatValue(r.newValue)}</b></td>
                <td className="mut sm">{r.reason}</td>
                <td>{empName(r.reqId)}</td>
                <td>
                  {r.status === 'pending' ? (
                    <>
                      <button className="btn primary sm" onClick={() => decideChange(r, true)}>Подтвердить</button>
                      <button className="btn danger sm" onClick={() => openReject(kindId, r)}>Отклонить</button>
                    </>
                  ) : (
                    <span className={'st-chip ' + (r.status === 'approved' ? 'approved' : 'rejected')}>{r.status}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <div className="tabs">
        {tabs.map(([id, l]) => (
          <button key={id} className={'tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>

      {canDecideChange && CHANGE_KINDS[tab] && renderChangeKindTab(tab)}

      {tab === 'vac' && (
        <div className="rep-panel">
          <div className="rep-panel-title">Отпуска с делегированием - на утверждение</div>
          <table className="tbl">
            <thead><tr><th>Сотрудник</th><th>Период</th><th>Замещающий</th><th>Решение</th></tr></thead>
            <tbody>
              {db.vacations.filter(v => v.status === 'pending' && canApproveVacation(ur, v, db)).map(v => (
                <tr key={v.id}>
                  <td><b>{empName(v.empId)}</b></td>
                  <td>{fmtDMY(v.start)} - {fmtDMY(v.end)}</td>
                  <td>{v.delegation.enabled ? empName(v.delegation.subId) : '-'}</td>
                  <td>
                    <button className="btn primary sm" onClick={() => decideVac(v, true)}>Утвердить</button>{' '}
                    <button className="btn danger sm" onClick={() => openReject('vac', v)}>Отклонить</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'rd' && (
        <div className="rep-panel">
          <div className="rep-panel-title">Передача ролей</div>
          <table className="tbl">
            <thead><tr><th>От</th><th>Кому</th><th>Роли</th><th>Статус / действие</th></tr></thead>
            <tbody>
              {db.roleDelegations.map(r => (
                <tr key={r.id}>
                  <td>{empName(r.fromId)}</td><td>{empName(r.toId)}</td>
                  <td>{r.roles.map(x => ROLES[x].label).join(', ')}</td>
                  <td>
                    {r.status === 'pending' && r.toId === ur.id ? (
                      <>
                        <button className="btn primary sm" onClick={() => decideRD(r, true)}>Принять</button>{' '}
                        <button className="btn danger sm" onClick={() => openReject('rd', r)}>Отклонить</button>
                      </>
                    ) : (
                      <span className={'st-chip ' + r.status}>{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'reg' && hasRole(ur, 'admin') && (
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
                    {r.status === 'pending' ? (
                      <>
                        <button className="btn primary sm" onClick={() => decideReg(r, true)}>Одобрить</button>{' '}
                        <button className="btn danger sm" onClick={() => openReject('reg', r)}>Отклонить</button>
                      </>
                    ) : (
                      <span className={'st-chip ' + (r.status === 'approved' ? 'approved' : 'rejected')}>{r.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejecting && (
        <RejectionReasonModal
          title={rejectionTitle}
          onSubmit={confirmReject}
          onClose={closeReject}
        />
      )}
    </div>
  );
}