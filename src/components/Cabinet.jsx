// src/components/Cabinet.jsx
import { useState, useMemo, useRef } from 'react';
import {
  DOMAIN, TASK_STATUSES, TASK_STATUS_ORDER, VACATION_TYPES,
  DIALOGS, TOASTS, FILE_LIMITS, FILE_MESSAGES,
} from '../utils/constants';
import { TODAY, fmtDMY, fmtD, iso, addDays } from '../utils/date';
import { isTaskActive } from '../utils/entityState';
import { useDataHelpers } from '../hooks';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { canManageProductionCalendar } from '../utils/permissions';
import { downloadCsv } from '../utils/csvExport';
import {
  buildEmployeePositions,
  formatPositionLabel,
} from '../utils/helpers';
import { Ic, ICONS } from './Icons';
import { Modal } from './Modal';
import ProductionCalendarView from './views/ProductionCalendarView';
import WorkloadView from './views/WorkloadView';

const PasswordChangeModal = ({ user, store, onClose }) => {
  const { showToast } = useToast();
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');
    if (user.pass !== oldPass) { setError('Неверный старый пароль'); return; }
    if (newPass.length < 8 || !/[A-ZА-ЯЁ]/.test(newPass) || !/[a-zа-яё]/.test(newPass) || !/\d/.test(newPass) || !/[^A-Za-zА-Яа-яЁё0-9]/.test(newPass)) {
      setError('Пароль должен содержать минимум 8 символов, заглавные и строчные буквы, цифру и спецсимвол');
      return;
    }
    if (newPass !== confirmPass) { setError('Пароли не совпадают'); return; }
    const history = user.passwordHistory || [];
    if (history.some(p => p === newPass)) {
      setError('Этот пароль уже использовался ранее. Выберите другой.');
      return;
    }
    store.upsertEmployee({
      ...user,
      pass: newPass,
      passwordHistory: [...history.slice(-4), newPass],
    });
    showToast('Пароль успешно изменён', 'success');
    onClose();
  };

  return (
    <Modal title="Смена пароля" onClose={onClose} width={460}>
      <div className="form-grid">
        <label className="lbl">Старый пароль<span className="required-star">*</span></label>
        <input className="inp" type="password" value={oldPass} onChange={e => setOldPass(e.target.value)} />
        <label className="lbl">Новый пароль<span className="required-star">*</span></label>
        <input className="inp" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
        <label className="lbl">Подтверждение<span className="required-star">*</span></label>
        <input className="inp" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
      </div>
      {error && <div className="login-err mt-2">{error}</div>}
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={handleSubmit}>Сменить пароль</button>
      </div>
    </Modal>
  );
};

export default function Cabinet({ store, data, user, openTask, openVacation, openDelegation, openEmployeeTasks }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { empName } = useDataHelpers(data);

  const [tab, setTab] = useState('overview');
  const [expFrom, setExpFrom] = useState('');
  const [expTo, setExpTo] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [phone, setPhone] = useState(user.phone || '');
  const [extension, setExtension] = useState(user.extension || '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const positions = useMemo(
    () => buildEmployeePositions(user, data),
    [user, data],
  );

  // Срезы фиксируем отдельными ссылками: data.tasks, data.projects
  // и т.д. стабильны, пока не меняется соответствующий срез (data -
  // useMemo от CabinetView). Значит useMemo-зависимости ниже срабатывают
  // по делу, а не на каждый рендер.
  const tasks       = data.tasks;
  const projects    = data.projects;
  const vacations   = data.vacations;
  const delegations = data.roleDelegations;

  const myTasks = useMemo(
    () => tasks.filter(t => isTaskActive(t) && t.assigneeId === user.id && !user.fired),
    [tasks, user.id, user.fired],
  );

  const myProjects = useMemo(() => {
    const ids = [...new Set(myTasks.map(t => t.projectId))];
    return ids.map(id => projects.find(p => p.id === id)).filter(Boolean);
  }, [myTasks, projects]);

  const myVacs = useMemo(
    () => vacations.filter(v => v.empId === user.id),
    [vacations, user.id],
  );

  const myDeleg = useMemo(
    () => delegations.filter(r => r.fromId === user.id || r.toId === user.id),
    [delegations, user.id],
  );

  // Массив дней - стабилен: диапазон определяется текущей датой,
  // при жизни компонента не меняется (перезагрузка страницы даст новый).
  const days = useMemo(() => {
    const out = [];
    for (let i = 19; i >= 0; i--) out.push(iso(addDays(new Date(), -i)));
    return out;
  }, []);

  const taskTableData = useMemo(() => {
    return myTasks.map(t => {
      const logMap = {};
      t.logs.forEach(l => {
        logMap[l.date] = (logMap[l.date] || 0) + l.hours;
      });
      return { task: t, logMap };
    });
  }, [myTasks]);

  const exportMyReport = () => {
    if (!expFrom || !expTo) {
      showToast('Выберите даты начала и окончания периода', 'warning');
      return;
    }
    if (expFrom > expTo) {
      showToast('Дата начала не может быть позже даты окончания', 'error');
      return;
    }

    const allLogs = [];
    myTasks.forEach(t => {
      const project = projects.find(p => p.id === t.projectId);
      t.logs.forEach(l => {
        if (l.date >= expFrom && l.date <= expTo) {
          allLogs.push({
            date: l.date,
            hours: l.hours,
            task: t.title,
            project: project?.code || '-',
          });
        }
      });
    });

    if (!allLogs.length) {
      showToast('За выбранный период нет учтенных часов', 'warning');
      return;
    }

    const rows = [['Проект', 'Задача', 'Дата', 'Часы']];
    allLogs.forEach(l => rows.push([l.project, l.task, fmtDMY(l.date), l.hours]));
    downloadCsv(`отчет_${user.last}_${expFrom}_${expTo}`, rows);
    showToast('Отчёт выгружен!', 'success');
  };

  const canEditCalendar = canManageProductionCalendar(user);

  const tabs = [
    ['overview', 'Сводка'],
    ['workload',   'Загрузка'],
    ['vacations', 'Мои отпуска'],
    ['delegation', 'Делегирование ролей'],
    ['profile', 'Профиль и уведомления'],
    ...(canEditCalendar ? [['calendar', 'Правка календаря']] : []),
  ];

  const handleSaveProfile = () => {
    if (!extension.trim()) {
      showToast('Внутренний номер телефона не может быть пустым', 'error');
      return;
    }
    store.upsertEmployee({
      ...user,
      phone: phone.trim(),
      extension: extension.trim(),
    });
    setEditMode(false);
    showToast('Данные обновлены', 'success');
  };

  const fileInputRef = useRef(null);
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(FILE_MESSAGES.notImage, 'error');
      e.target.value = '';
      return;
    }
    if (file.size > FILE_LIMITS.profilePhoto) {
      showToast(FILE_MESSAGES.profilePhotoTooLarge, 'error');
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      store.upsertEmployee({ ...user, photo: ev.target.result });
      showToast('Фото загружено', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoDelete = async () => {
    if (!user.photo) return;
    const ok = await confirm(DIALOGS.deleteProfilePhoto);
    if (!ok) return;
    store.upsertEmployee({ ...user, photo: null });
    showToast(TOASTS.photoDeleted, 'info');
  };

  return (
    <div className="cab">
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="flex flex-col gap-4">
          <div className="rep-panel">
            <div className="rep-panel-title">Затраченные часы по задачам (последние 20 дней)</div>
            <div className="toolbar flex items-center flex-wrap gap-2 mb-3">
              <span className="mut sm">Экспорт:</span>
              <input className="inp w-150" type="date" value={expFrom} onChange={e => setExpFrom(e.target.value)} />
              <span className="mut sm">-</span>
              <input className="inp w-150" type="date" value={expTo} onChange={e => setExpTo(e.target.value)} />
              <button className="btn primary sm" onClick={exportMyReport}>
                <Ic d={ICONS.download} size={13} /> Выгрузить в Excel (CSV)
              </button>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="tbl w-full cab-timesheet-table">
                <thead>
                  <tr>
                    <th className="text-left border-b cab-timesheet-task-col">Задача</th>
                    {days.map(d => (
                      <th key={d} className="text-center border-b text-xs text-mut cab-timesheet-day-col">
                        {fmtD(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taskTableData.map(({ task, logMap }) => (
                    <tr key={task.id} className="cursor-pointer" onClick={() => openTask(task.id)}>
                      <td className="text-left font-semibold border-b">
                        {task.title}
                        <span className="mut sm font-normal ml-2">
                          ({projects.find(p => p.id === task.projectId)?.code || '-'})
                        </span>
                      </td>
                      {days.map(d => (
                        <td key={d} className="text-center border-b">
                          {logMap[d] ? <b>{logMap[d]} ч</b> : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {taskTableData.length === 0 && (
                    <tr><td colSpan={days.length + 1} className="mut text-center p-5">Нет учтённых часов</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rep-panel">
            <div className="rep-panel-title">Мои задачи по статусам</div>
            {TASK_STATUS_ORDER.map(st => {
              const list = myTasks.filter(t => t.status === st);
              if (!list.length) return null;
              return (
                <div key={st} className="cab-stat">
                  <div className="cab-stat-head">
                    <span className="kdot" style={{ background: TASK_STATUSES[st].color }} />
                    {TASK_STATUSES[st].label}
                    <span className="kcount">{list.length}</span>
                  </div>
                  {list.map(t => (
                    <div key={t.id} className="cab-task" onClick={() => openTask(t.id)}>
                      <span className="pdot" style={{ background: projects.find(p => p.id === t.projectId)?.color }} />
                      {t.title}
                      <span className="mut sm">
                        {' · '}
                        {t.deadline ? `до ${fmtD(t.deadline)}` : 'без срока исполнения'}
                        {' · '}
                        {t.plannedHours ?? '-'} ч
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
            {myTasks.length === 0 && <div className="mut">Задач пока нет</div>}
          </div>

          <div className="rep-panel">
            <div className="rep-panel-title">Мои проекты</div>
            {myProjects.map(p => (
              <div key={p.id} className="cab-proj">
                <span className="pdot" style={{ background: p.color }} />
                {p.code} - {p.name}
                {p.ptype === 'admin' && <span className="adm-badge ml-2">адм</span>}
              </div>
            ))}
            {myProjects.length === 0 && <div className="mut">Нет участия в проектах</div>}
          </div>
        </div>
      )}

      {tab === 'workload' && (
        <WorkloadView
          ur={user}
          store={store}
          openEmployeeTasks={openEmployeeTasks}
        />
      )}

      {tab === 'vacations' && (
        <div className="rep-panel">
          <div className="rep-panel-title flex items-center">
            Мои отпуска
            <button className="btn primary sm ml-auto" onClick={() => openVacation(null)}>
              <Ic d={ICONS.plus} size={13} /> Добавить отпуск
            </button>
          </div>
          <table className="tbl">
            <thead>
              <tr>
                <th>Начало</th><th>Окончание</th><th>Тип</th><th>Комментарий</th>
                <th>Делегирование</th><th>Статус</th><th></th>
              </tr>
            </thead>
            <tbody>
              {myVacs.map(v => {
                const started = v.start <= TODAY;
                return (
                  <tr key={v.id}>
                    <td>{fmtDMY(v.start)}</td>
                    <td>{fmtDMY(v.end)}</td>
                    <td>{VACATION_TYPES[v.type]}</td>
                    <td>{v.comment || '-'}</td>
                    <td>{v.delegation.enabled ? `→ ${empName(v.delegation.subId)}` : '-'}</td>
                    <td>
                      <span className={`st-chip ${v.status}`}>
                        {{ pending: 'На утверждении', approved: 'Утверждён', rejected: 'Отклонён' }[v.status]}
                      </span>
                    </td>
                    <td>
                      {!started && v.status !== 'rejected' ? (
                        <>
                          <button className="icon-btn" onClick={() => openVacation(v.id)}>
                            <Ic d={ICONS.edit} size={14} />
                          </button>
                          <button className="icon-btn danger" onClick={() => {
                            store.deleteVacation(v.id);
                            store.addAudit('Удаление отпуска', fmtDMY(v.start));
                          }}>
                            <Ic d={ICONS.trash} size={14} />
                          </button>
                        </>
                      ) : (
                        <span className="mut sm">{started ? 'изменение через HR/администратора' : ''}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {myVacs.length === 0 && <tr><td colSpan="7" className="mut">Отпусков нет</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'delegation' && (
        <div className="rep-panel">
          <div className="rep-panel-title flex items-center">
            Временная передача ролей
            <button className="btn primary sm ml-auto" onClick={openDelegation}>
              <Ic d={ICONS.plus} size={13} /> Делегировать роль
            </button>
          </div>
          <p className="mut sm">
            Роли «Суперадминистратор» и «Генеральный директор» делегируются только через
            суперадминистратора. Получатель должен подтвердить принятие.
          </p>
          <table className="tbl">
            <thead>
              <tr>
                <th>От кого</th><th>Кому</th><th>Роли</th><th>Период</th>
                <th>Статус</th><th></th>
              </tr>
            </thead>
            <tbody>
              {myDeleg.map(r => (
                <tr key={r.id}>
                  <td>{empName(r.fromId)}</td>
                  <td>{empName(r.toId)}</td>
                  <td>{r.roles.join(', ')}</td>
                  <td>{fmtDMY(r.start)} - {r.end ? fmtDMY(r.end) : 'до отмены'}</td>
                  <td>
                    <span className={`st-chip ${r.status}`}>
                      {{ pending: 'Ожидает принятия', active: 'Активно', rejected: 'Отклонено', revoked: 'Отозвано', expired: 'Истекло' }[r.status]}
                    </span>
                  </td>
                  <td>
                    {r.status === 'active' && r.fromId === user.id && (
                      <button className="btn ghost sm" onClick={() => { /* revoke */ }}>Отозвать</button>
                    )}
                  </td>
                </tr>
              ))}
              {myDeleg.length === 0 && <tr><td colSpan="6" className="mut">Делегирований нет</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'calendar' && canEditCalendar && (
        <ProductionCalendarView store={store} />
      )}

      {tab === 'profile' && (
        <>
          <div className="cab-grid">
            <div className="rep-panel">
              <div className="rep-panel-title">Личные данные</div>
              <div className="flex gap-4 flex-wrap">
                <div className="cab-photo-col">
                  {user.photo
                    ? <img src={user.photo} alt="Аватар" className="cab-profile-photo" />
                    : <div className="cab-profile-photo-empty">Нет фото</div>}
                  <input type="file" accept="image/*" ref={fileInputRef}
                    className="file-input-hidden" onChange={handlePhotoUpload} />
                  <button className="btn primary sm" onClick={() => fileInputRef.current?.click()}>
                    Загрузить фото
                  </button>
                  {user.photo && (
                    <button className="btn ghost sm" onClick={handlePhotoDelete}>Удалить фото</button>
                  )}
                </div>

                <div className="cab-profile-fields">
                  <div className="form-grid">
                    <label className="lbl">Фамилия</label>
                    <input className="inp" disabled value={user.last} />

                    <label className="lbl">Имя</label>
                    <input className="inp" disabled value={user.first} />

                    <label className="lbl">Должность</label>
                    <input className="inp" disabled value={user.position || 'Сотрудник'} />

                    <label className="lbl">E-mail</label>
                    <input className="inp" disabled value={user.email + '@' + DOMAIN} />

                    <label className="lbl">Мобильный телефон</label>
                    <input className="inp" disabled={!editMode} value={phone}
                      onChange={e => setPhone(e.target.value)} />

                    <label className="lbl">
                      Внутренний номер телефона<span className="required-star">*</span>
                    </label>
                    <input className="inp" disabled={!editMode} value={extension}
                      onChange={e => setExtension(e.target.value)}
                      onBlur={() => {
                        if (!extension.trim()) showToast('Внутренний номер телефона обязателен', 'error');
                      }} />

                    <label className="lbl">Табельный №</label>
                    <input className="inp" disabled value={user.tab || ''} />

                    <label className="lbl">Подразделения</label>
                    <div className="depts-readonly">
                      {positions.map((p, i) => (
                        <span key={i} className={`dept-chip${p.kind === 'primary' ? ' prim' : ''}`}>
                          {formatPositionLabel(p)}
                          <span className="mut sm">
                            {' · '}{p.kind === 'primary' ? 'основное' : 'совм'}
                          </span>
                        </span>
                      ))}
                      {positions.length === 0 && <span className="mut sm">не назначены</span>}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3 justify-end items-center">
                    <button className="btn danger" onClick={() => setShowPasswordModal(true)}>
                      Изменить пароль
                    </button>
                    {editMode ? (
                      <>
                        <button className="btn ghost" onClick={() => {
                          setEditMode(false);
                          setPhone(user.phone || '');
                          setExtension(user.extension || '');
                        }}>Отмена</button>
                        <button className="btn primary" onClick={handleSaveProfile}>Сохранить</button>
                      </>
                    ) : (
                      <button className="btn primary" onClick={() => setEditMode(true)}>
                        Изменить данные
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="rep-panel">
              <div className="rep-panel-title">Уведомления</div>
              {[
                ['deadlineEmail', 'E-mail о сроках - за 3 дня до срока исполнения задачи'],
                ['overdueDigest', 'Контроль просрочек - ежедневная сводка'],
                ['commentSub', 'Подписка на обсуждение задач, где я исполнитель или ответственный'],
              ].map(([k, label]) => (
                <label key={k} className="toggle-row">
                  <span>{label}</span>
                  <span className={`toggle${user.notif[k] ? ' on' : ''}`} onClick={() => {
                    store.upsertEmployee({
                      ...user,
                      notif: { ...user.notif, [k]: !user.notif[k] },
                    });
                  }}><span className="toggle-knob" /></span>
                </label>
              ))}
              <p className="mut sm">
                Критичные уведомления (восстановление пароля, утверждения) отключить нельзя.
              </p>

              <div className="rep-panel-title mt-4">История делегирований</div>
              {delegations.filter(r => r.fromId === user.id).map(r => (
                <div key={r.id} className="mut sm">
                  → {empName(r.toId)}: {r.roles.join(', ')} (
                  {fmtDMY(r.start)} - {r.end ? fmtDMY(r.end) : 'до отмены'})
                </div>
              ))}
              {delegations.filter(r => r.fromId === user.id).length === 0 && (
                <div className="mut sm">Передач ролей не было</div>
              )}
            </div>
          </div>

          {showPasswordModal && (
            <PasswordChangeModal
              user={user}
              store={store}
              onClose={() => setShowPasswordModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
}