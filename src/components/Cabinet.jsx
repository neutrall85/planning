import React, { useState, useMemo, useRef } from 'react';
import { TASK_STATUSES, TASK_STATUS_ORDER, VACATION_TYPES, PROJECT_CATEGORIES } from '../utils/constants';
import { TODAY, fmtDMY, fmtD, iso, addDays, initials, isTaskActive } from '../utils/date';
import { useDataHelpers } from '../hooks';
import { hasRole } from '../utils/permissions';
import { Ic, ICONS } from './Icons';
import { useToast } from './Toast';
import EmployeeTooltip from './EmployeeTooltip';

function getCategoryColor(project) {
  if (!project || project.ptype === 'admin') return '#6b7280';
  const categoryKey = Object.keys(PROJECT_CATEGORIES).find(
    key => PROJECT_CATEGORIES[key].label === project.category
  );
  return PROJECT_CATEGORIES[categoryKey]?.color || PROJECT_CATEGORIES.NORM.color;
}

function downloadCSV(name, rows) {
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name.endsWith('.csv') ? name : name + '.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 500);
}

export default function Cabinet({ store, data, user, openTask, openVacation, openDelegation, openEmployeeEdit, openChangePassword, toast }) {
  const { empName, getEmployeeLoad } = useDataHelpers(data);
  const [tab, setTab] = useState('overview');

  const showToast = useToast(toast);

  const [expFrom, setExpFrom] = useState('');
  const [expTo, setExpTo] = useState('');
  
  // Состояние для tooltip
  const [tooltip, setTooltip] = useState({ visible: false, employee: null, x: 0, y: 0 });

  const myTasks = data.tasks.filter(t => isTaskActive(t) && (t.assigneeIds || []).includes(user.id) && !user.fired);
  const myProjects = [...new Set(myTasks.map(t => t.projectId))].map(id => data.projects.find(p => p.id === id)).filter(Boolean);
  const myVacs = data.vacations.filter(v => v.empId === user.id);
  const myDeleg = data.roleDelegations.filter(r => r.fromId === user.id || r.toId === user.id);

  const range = 20;
  const days = [];
  for (let i = range - 1; i >= 0; i--) days.push(iso(addDays(new Date(), -i)));

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
    if (!expFrom || !expTo) return showToast('Выберите даты начала и окончания периода');
    if (expFrom > expTo) return showToast('Дата начала не может быть позже даты окончания');

    const allLogs = [];
    myTasks.forEach(t => {
      const project = data.projects.find(p => p.id === t.projectId);
      t.logs.forEach(l => {
        if (l.date >= expFrom && l.date <= expTo) {
          allLogs.push({
            date: l.date,
            hours: l.hours,
            task: t.title,
            project: project?.code || '—'
          });
        }
      });
    });

    if (!allLogs.length) return showToast('За выбранный период нет учтенных часов');

    const rows = [['Проект', 'Задача', 'Дата', 'Часы']];
    allLogs.forEach(l => rows.push([l.project, l.task, fmtDMY(l.date), l.hours]));
    
    downloadCSV(`отчет_${user.last}_${expFrom}_${expTo}`, rows);
    showToast('Отчёт выгружен!', 'success');
  };

  const tabs = useMemo(() => {
    const baseTabs = [
      ['overview', 'Сводка'],
      ['vacations', 'Мои отпуска'],
      ['profile', 'Профиль и уведомления']
    ];
    // Вкладка "Делегирование ролей" доступна суперадминам, генеральному директору и тем, у кого есть право делегирования
    if (!hasRole(user, 'executor', 'admin')) {
      baseTabs.splice(2, 0, ['delegation', 'Делегирование ролей']);
    }
    return baseTabs;
  }, [user]);

  // Загрузка фото
  const fileInputRef = useRef(null);
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photoData = ev.target.result; // base64
      const updated = { ...user, photo: photoData };
      store.upsertEmployee(updated);
      showToast('Фото загружено', 'success');
    };
    reader.readAsDataURL(file);
  };
  const handlePhotoDelete = () => {
    if (user.photo && window.confirm('Удалить фото?')) {
      const updated = { ...user, photo: null };
      store.upsertEmployee(updated);
    }
  };

  return (
    <div className="cab">
      <div className="tabs">
        {tabs.map(([id, label]) => (
          <button key={id} className={`tab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Блок: Затраченные часы (последние 20 дней) */}
          <div className="rep-panel">
            <div className="rep-panel-title">Затраченные часы по задачам (за прошедшие 20 дней)</div>
            <div className="toolbar" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <span className="mut sm">Экспорт:</span>
              <input className="inp" type="date" style={{ width: 150 }} value={expFrom} onChange={e => setExpFrom(e.target.value)} />
              <span className="mut sm">—</span>
              <input className="inp" type="date" style={{ width: 150 }} value={expTo} onChange={e => setExpTo(e.target.value)} />
              <button className="btn primary sm" onClick={exportMyReport}>
                <Ic d={ICONS.download} size={13} /> Выгрузить в Excel (CSV)
              </button>
            </div>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table className="tbl" style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ minWidth: '200px', textAlign: 'left', borderBottom: '1px solid var(--line)' }}>Задача</th>
                    {days.map(d => (
                      <th key={d} style={{ textAlign: 'center', minWidth: '60px', borderBottom: '1px solid var(--line)', fontSize: '11px', color: 'var(--mut)' }}>
                        {fmtD(d)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {taskTableData.map(({ task, logMap }) => (
                    <tr key={task.id} style={{ cursor: 'pointer' }} onClick={() => openTask(task.id)}>
                      <td style={{ textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>
                        {task.title}
                        <span className="mut sm" style={{ marginLeft: 8, fontWeight: 400 }}>
                          ({data.projects.find(p => p.id === task.projectId)?.code || '—'})
                        </span>
                      </td>
                      {days.map(d => (
                        <td key={d} style={{ textAlign: 'center', borderBottom: '1px solid #f1f5f9' }}>
                          {logMap[d] ? <b>{logMap[d]} ч</b> : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {taskTableData.length === 0 && (
                    <tr><td colSpan={days.length + 1} className="mut" style={{ textAlign: 'center', padding: 20 }}>Нет учтённых часов</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Блок: Мои задачи по статусам */}
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
                      <span className="pdot" style={{ background: data.projects.find(p => p.id === t.projectId)?.color }} />
                      {t.title}
                      <span className="mut sm"> · {t.deadline ? `до ${fmtD(t.deadline)}` : 'без срока'} · {t.plannedHours ?? '—'} ч</span>
                    </div>
                  ))}
                </div>
              );
            })}
            {myTasks.length === 0 && <div className="mut">Задач пока нет</div>}
          </div>

          {/* Блок: Мои проекты */}
          <div className="rep-panel">
            <div className="rep-panel-title">Мои проекты</div>
            {myProjects.map(p => (
              <div key={p.id} className="cab-proj">
                <span className="pdot" style={{ background: getCategoryColor(p) }} />
                {p.code} — {p.name}
                {p.ptype === 'admin' && <span className="adm-badge" style={{ marginLeft: 8 }}>адм</span>}
              </div>
            ))}
            {myProjects.length === 0 && <div className="mut">Нет участия в проектах</div>}
          </div>
        </div>
      )}

      {tab === 'vacations' && (
        <div className="rep-panel">
          <div className="rep-panel-title">
            Мои отпуска
            <button className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={() => openVacation(null)}>
              <Ic d={ICONS.plus} size={13} /> Добавить отпуск
            </button>
          </div>
          <table className="tbl">
            <thead><tr><th>Начало</th><th>Окончание</th><th>Тип</th><th>Комментарий</th><th>Делегирование</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {myVacs.map(v => {
                const started = v.start <= TODAY;
                return (
                  <tr key={v.id}>
                    <td>{fmtDMY(v.start)}</td><td>{fmtDMY(v.end)}</td>
                    <td>{VACATION_TYPES[v.type]}</td>
                    <td>{v.comment || '—'}</td>
                    <td>{v.delegation.enabled ? `→ ${empName(v.delegation.subId)}` : '—'}</td>
                    <td><span className={`st-chip ${v.status}`}>
                      {{ pending: 'На утверждении', approved: 'Утверждён', rejected: 'Отклонён' }[v.status]}
                    </span></td>
                    <td>
                      {!started && v.status !== 'rejected' ? (
                        <>
                          <button className="icon-btn" onClick={() => openVacation(v.id)}><Ic d={ICONS.edit} size={14} /></button>
                          <button className="icon-btn danger" onClick={() => { store.deleteVacation(v.id); store.addAudit('Удаление отпуска', fmtDMY(v.start)); }}><Ic d={ICONS.trash} size={14} /></button>
                        </>
                      ) : <span className="mut sm">{started ? 'изменение через HR/администратора' : ''}</span>}
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
          <div className="rep-panel-title">
            Временная передача ролей
            <button className="btn primary sm" style={{ marginLeft: 'auto' }} onClick={openDelegation}>
              <Ic d={ICONS.plus} size={13} /> Делегировать роль
            </button>
          </div>
          <p className="mut sm">Роли «Суперадминистратор» и «Генеральный директор» делегируются только через суперадминистратора. Получатель должен подтвердить принятие.</p>
          <table className="tbl">
            <thead><tr><th>От кого</th><th>Кому</th><th>Роли</th><th>Период</th><th>Статус</th><th></th></tr></thead>
            <tbody>
              {myDeleg.map(r => (
                <tr key={r.id}>
                  <td>{empName(r.fromId)}</td><td>{empName(r.toId)}</td>
                  <td>{r.roles.join(', ')}</td>
                  <td>{fmtDMY(r.start)} — {r.end ? fmtDMY(r.end) : 'до отмены'}</td>
                  <td><span className={`st-chip ${r.status}`}>
                    {{ pending: 'Ожидает принятия', active: 'Активно', rejected: 'Отклонено', revoked: 'Отозвано', expired: 'Истекло' }[r.status]}
                  </span></td>
                  <td>
                    {r.status === 'active' && r.fromId === user.id && (
                      <button 
                        className="btn ghost sm" 
                        onClick={() => {
                          if (window.confirm('Отозвать делегирование ролей?')) {
                            store.revokeRoleDelegation(r.id);
                            toast('Делегирование отозвано', 'success');
                          }
                        }}
                      >
                        Отозвать
                      </button>
                    )}
                    {r.status === 'pending' && r.toId === user.id && (
                      <>
                        <button className="btn primary sm" onClick={() => { store.approveRoleDelegation(r.id, true); toast('Делегирование принято', 'success'); }}>Принять</button>
                        <button className="btn danger sm" onClick={() => { store.approveRoleDelegation(r.id, false); }}>Отклонить</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {myDeleg.length === 0 && <tr><td colSpan="6" className="mut">Делегирований нет</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'profile' && (
        <div className="cab-grid">
          <div className="rep-panel">
            <div className="rep-panel-title">Личные данные</div>
            {/* Двухколоночный макет: слева фото, справа форма */}
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Левая колонка – фото и кнопки */}
              <div style={{ flex: '0 0 140px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                {user.photo ? (
                  <img 
                    src={user.photo} 
                    alt="Аватар" 
                    style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--line)', cursor: 'pointer' }}
                    onMouseEnter={(e) => setTooltip({ visible: true, employee: user, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                    onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                  />
                ) : (
                  <div 
                    style={{ width: 120, height: 120, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}
                    onMouseEnter={(e) => setTooltip({ visible: true, employee: user, x: e.clientX, y: e.clientY })}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                    onMouseMove={(e) => setTooltip(prev => ({ ...prev, x: e.clientX, y: e.clientY }))}
                  >Нет фото</div>
                )}
                <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} />
                <button className="btn primary sm" onClick={() => fileInputRef.current?.click()}>Загрузить фото</button>
                {user.photo && <button className="btn ghost sm" onClick={handlePhotoDelete}>Удалить фото</button>}
              </div>

              {/* Правая колонка – форма с данными */}
              <div style={{ flex: 1, minWidth: 300 }}>
                <div className="form-grid">
                  {/* Фамилия и Имя разделены */}
                  <label className="lbl">Фамилия</label>
                  <input className="inp" disabled value={user.last} />
                  <label className="lbl">Имя</label>
                  <input className="inp" disabled value={user.first} />
                  
                  <label className="lbl">E-mail</label>
                  <input className="inp" disabled value={user.email} />
                  
                  <label className="lbl">Мобильный телефон</label>
                  <input
                    className="inp"
                    disabled
                    value={user.phone || ''}
                    placeholder="+7 (___) ___-__-__"
                  />

                  <label className="lbl">Внутренний номер телефона</label>
                  <input
                    className="inp"
                    disabled
                    value={user.extension || ''}
                    placeholder="1234"
                  />
                  
                  <label className="lbl">Табельный №</label>
                  <input className="inp" disabled value={user.tab || ''} />
                  
                  <label className="lbl">Подразделения</label>
                  <div className="depts-readonly">
                    {user.departments.map(d => {
                      const dd = data.departments.find(x => x.id === d.deptId);
                      return dd ? <span key={d.deptId} className={`dept-chip${d.primary ? ' prim' : ''}`}>{dd.name}{d.primary ? ' · основное' : ''}</span> : null;
                    })}
                    {user.departments.length === 0 && <span className="mut sm">не назначены</span>}
                    <div className="mut sm" style={{ marginTop: 6 }}>Подразделения изменяют только HR-менеджер, суперадминистратор и генеральный директор.</div>
                  </div>
                  
                  <label className="lbl">Пароль</label>
                  <input className="inp" disabled value="••••••••" />
                  
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {!hasRole(user, 'admin') && (
                      <button className="btn ghost sm" onClick={() => openEmployeeEdit(user.id)}>Изменить данные</button>
                    )}
                    <button className="btn ghost sm" onClick={openChangePassword}>Сменить пароль</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rep-panel">
            <div className="rep-panel-title">Уведомления</div>
            {[
              ['deadlineEmail', 'E-mail о сроках — за 3 дня до срока выполнения задачи'],
              ['overdueDigest', 'Контроль просрочек — ежедневная сводка'],
              ['commentSub', 'Подписка на обсуждение задач, где я исполнитель или ответственный']
            ].map(([k, label]) => (
              <label key={k} className="toggle-row">
                <span>{label}</span>
                <span className={`toggle${user.notif[k] ? ' on' : ''}`} onClick={() => {
                  const updated = { ...user, notif: { ...user.notif, [k]: !user.notif[k] } };
                  store.upsertEmployee(updated);
                }}><span className="toggle-knob" /></span>
              </label>
            ))}
            <p className="mut sm">Критичные уведомления (восстановление пароля, утверждения) отключить нельзя.</p>

            <div className="rep-panel-title" style={{ marginTop: 16 }}>История делегирований</div>
            {data.roleDelegations.filter(r => r.fromId === user.id).map(r => (
              <div key={r.id} className="mut sm">→ {empName(r.toId)}: {r.roles.join(', ')} ({fmtDMY(r.start)} — {r.end ? fmtDMY(r.end) : 'до отмены'})</div>
            ))}
            {data.roleDelegations.filter(r => r.fromId === user.id).length === 0 && <div className="mut sm">Передач ролей не было</div>}
          </div>
        </div>
      )}

      {/* Tooltip сотрудника */}
      <EmployeeTooltip {...tooltip} />
    </div>
  );
}