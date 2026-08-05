import React, { useState } from 'react';
import { useAuth, useStore } from '../hooks';
import { hasRole, canCreateTask, canExport, canEditTask, canCreateProject } from '../utils/permissions';
import { ICONS, Ic } from './Icons';
import { initials, TODAY, fmtDMY, fmtDT } from '../utils/date';
import { TASK_STATUSES, ROLES, PROJECT_STATUSES } from '../utils/constants';
import Kanban from './Kanban';
import Gantt from './Gantt';
import Calendar from './Calendar';
import Projects from './Projects';
import Cabinet from './Cabinet';
import Staff from './Staff';
import Reports from './Reports';
import Archive from './Archive';
import Requests from './Requests';
import Journal from './Journal';
import NotifPanel from './NotifPanel';
import { TaskModal, ProjectModal, HoursRequestModal, RolesModal, DeptsModal, VacationModal, DelegationModal, VacNowModal } from './Modals';

export default function MainLayout({ store, data, user }) {
  const { logout } = useStore();
  const [view, setView] = useState('kanban');
  const [modal, setModal] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [vacModalOpen, setVacModalOpen] = useState(false);

  const spent = (task) => task.logs.reduce((s, l) => s + l.hours, 0);
  const planSum = (projectId) => data.tasks.filter(t => t.projectId === projectId).reduce((s, t) => s + (t.plannedHours || 0), 0);

  const empName = (id) => {
    if (!id) return '—';
    const e = data.employees.find(x => x.id === id);
    return e ? `${e.last} ${e.first}` : '—';
  };

  const navItems = [
    { id: 'kanban', label: 'Канбан', icon: ICONS.kanban },
    { id: 'gantt', label: 'Диаграмма Ганта', icon: ICONS.gantt },
    { id: 'calendar', label: 'Календарь', icon: ICONS.cal },
    { id: 'projects', label: 'Проекты', icon: ICONS.folder },
    ...(hasRole(user, 'admin', 'director', 'economist', 'kb_chief', 'head', 'hr') ? [{ id: 'staff', label: 'Персонал', icon: ICONS.users }] : []),
    ...(canExport(user) || hasRole(user, 'kb_chief', 'head', 'pm', 'hr') ? [{ id: 'reports', label: 'Отчёты', icon: ICONS.chart }] : []),
    { id: 'archive', label: 'Архив', icon: ICONS.archive },
    { id: 'requests', label: 'Запросы и заявки', icon: ICONS.inbox },
    ...(hasRole(user, 'admin', 'director') ? [{ id: 'journal', label: 'Журнал аудита', icon: ICONS.book }] : []),
  ];

  const myNotifs = data.notifications.filter(n => n.userId === user.id);
  const unread = myNotifs.filter(n => !n.read).length;

  const openTask = (taskId = null) => setModal({ type: 'task', taskId });
  const openProject = (projectId = null) => setModal({ type: 'project', projectId });
  const openHoursReq = (kind, targetId) => setModal({ type: 'hours', kind, targetId });
  const openRoles = (empId) => setModal({ type: 'roles', empId });
  const openDepts = (empId) => setModal({ type: 'depts', empId });
  const openVacation = (vacationId = null, forEmpId = null) => setModal({ type: 'vacation', vacationId, forEmpId });
  const openDelegation = () => setModal({ type: 'delegation' });

  const handleMoveTask = (taskId, newStatus) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    if ((newStatus === 'closed' || newStatus === 'cancelled') && !canEditTask(user, task, data)) {
      alert('У вас нет прав на закрытие или отмену этой задачи.');
      return;
    }
    // ИЗМЕНЕНИЕ: при закрытии/отмене задача архивируется
    const isClosing = (newStatus === 'closed' || newStatus === 'cancelled') && task.status !== newStatus;
    const updatedTask = {
      ...task,
      status: newStatus,
      closedAt: isClosing ? TODAY : task.closedAt,
      archived: isClosing ? true : task.archived,
      archivedAt: isClosing ? TODAY : task.archivedAt,
      history: [...task.history, { ts: Date.now(), who: user.id, text: `Статус → ${TASK_STATUSES[newStatus].label}` }]
    };
    store.upsertTask(updatedTask);
    store.addAudit('Изменение статуса задачи', `${task.title} → ${TASK_STATUSES[newStatus].label}`);

    // ИЗМЕНЕНИЕ: уведомления при изменении статуса
    if (newStatus === 'review') {
      const creatorId = task.creatorId || task.history?.find(h => h.who !== 'system')?.who || task.history[0]?.who;
      const project = data.projects.find(p => p.id === task.projectId);
      let managerId = project?.managerId;
      if (!managerId) {
        const pmCandidate = data.employees.find(e =>
          e.roles.includes('pm') &&
          data.tasks.some(t => t.projectId === task.projectId && t.assigneeId === e.id)
        );
        if (pmCandidate) managerId = pmCandidate.id;
      }
      if (creatorId && creatorId !== user.id) {
        store.addNotification(
          creatorId,
          `Задача "${task.title}" переведена на проверку исполнителем ${user.last} ${user.first}.`,
          { targetType: 'task', targetId: task.id }
        );
      }
      if (managerId && managerId !== user.id && managerId !== creatorId) {
        store.addNotification(
          managerId,
          `Задача "${task.title}" переведена на проверку исполнителем ${user.last} ${user.first}.`,
          { targetType: 'task', targetId: task.id }
        );
      }
    }
    // ИЗМЕНЕНИЕ: уведомление автору при закрытии/отмене
    if (isClosing) {
      const creatorId = task.creatorId;
      if (creatorId && creatorId !== user.id) {
        store.addNotification(
          creatorId,
          `Задача "${task.title}" ${newStatus === 'closed' ? 'закрыта' : 'отменена'} пользователем ${user.last} ${user.first}.`,
          { targetType: 'task', targetId: task.id }
        );
      }
    }
  };

  const handleNotificationNavigate = (notification) => {
    const { targetType, targetId } = notification;
    if (!targetType || !targetId) return;
    switch (targetType) {
      case 'task': openTask(targetId); break;
      case 'project': openProject(targetId); break;
      case 'hours': openHoursReq('task', targetId); break;
      case 'vacation': openVacation(targetId); break;
      case 'delegation':
      case 'registration': setView('requests'); break;
      default: break;
    }
    setNotifOpen(false);
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">АП</div>
          <div><div className="logo-name">АЭРОПЛАН</div><div className="logo-sub">планирование и учёт времени</div></div>
        </div>
        <div className="user-card user-card-clickable" onClick={() => setView('cabinet')}>
          <div className="avatar">{initials(user.first, user.last)}</div>
          <div className="user-meta">
            <div className="user-name">{user.last} {user.first}</div>
            <div className="user-roles">{user.roles.join(' · ')}</div>
          </div>
          <button className="icon-btn dark" onClick={(e) => { e.stopPropagation(); logout(); }} title="Выйти"><Ic d={ICONS.out} size={16} /></button>
        </div>
        <nav className="nav">
          {navItems.map(n => (
            <button key={n.id} className={`nav-item${view === n.id ? ' on' : ''}`} onClick={() => setView(n.id)}>
              <Ic d={n.icon} /> <span className="nav-lbl">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="env-badge"><Ic d={ICONS.shield} size={14} /> Демо · заглушка Java/PostgreSQL</div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">{navItems.find(n => n.id === view)?.label || 'Личный кабинет'}</h1>
            <div className="page-sub">Вторник, 4 августа 2026 · вы вошли как {user.last} {user.first}</div>
          </div>
          <div className="top-tools">
            <button className="btn ghost" onClick={() => setVacModalOpen(true)}><Ic d={ICONS.beach} size={15} /> Сотрудники в отпусках</button>
            <div className="bell-wrap">
              <button className={`icon-btn bell${unread ? ' has' : ''}`} onClick={() => setNotifOpen(v => !v)}>
                <Ic d={ICONS.bell} size={17} />
                {unread > 0 && <span className="bell-count">{unread}</span>}
              </button>
              {notifOpen && (
                <NotifPanel 
                  list={myNotifs} 
                  setDb={(fn) => { store._data = fn(store._data); store._notify(); }} 
                  onNavigate={handleNotificationNavigate}
                />
              )}
            </div>
          </div>
        </header>

        <div className="content">
          {view === 'kanban' && <Kanban db={data} ur={user} openTask={openTask} onMove={handleMoveTask} onNew={() => openTask(null)} />}
          {view === 'gantt' && <Gantt db={data} ur={user} openTask={openTask} />}
          {view === 'calendar' && <Calendar db={data} ur={user} openTask={openTask} />}
          {view === 'projects' && <Projects db={data} ur={user} openProject={openProject} openHoursReq={openHoursReq} closeProject={(p) => { store.upsertProject({...p, status:'closed', closedAt:TODAY}); data.tasks.filter(t=>t.projectId===p.id && !['closed','cancelled'].includes(t.status)).forEach(t=>{store.upsertTask({...t, status:'closed', closedAt:TODAY})}); store.addAudit('Закрытие проекта', p.name); }} cancelProject={(p) => { store.upsertProject({...p, status:'cancelled'}); store.addAudit('Отмена проекта', p.name); }} />}
          {view === 'cabinet' && <Cabinet store={store} data={data} user={user} openTask={openTask} openVacation={openVacation} openDelegation={openDelegation} />}
          {view === 'staff' && <Staff 
            db={data} 
            ur={user} 
            setDb={(fn) => { store._data = fn(store._data); store._notify(); }} 
            openRoles={openRoles} 
            openDepts={openDepts} 
            openVacation={openVacation} 
          />}
          {view === 'reports' && <Reports db={data} ur={user} />}
          {view === 'archive' && <Archive db={data} ur={user} openTask={openTask} runArchive={() => store.runArchive(data.settings?.archiveMonths || 6)} setArchiveMonths={(m) => { store._data.settings.archiveMonths = m; store._notify(); }} restoreTask={(id) => { const t = data.tasks.find(x => x.id === id); store.upsertTask({...t, archived: false, archivedAt: null}); }} restoreProject={(id) => { const p = data.projects.find(x => x.id === id); store.upsertProject({...p, archived: false, archivedAt: null}); data.tasks.filter(t => t.projectId === id).forEach(t=>{store.upsertTask({...t, archived: false, archivedAt: null})}); }} />}
          {view === 'requests' && <Requests db={data} setDb={(fn) => { store._data = fn(store._data); store._notify(); }} ur={user} />}
          {view === 'journal' && <Journal db={data} ur={user} />}
        </div>
      </main>

      {modal?.type === 'task' && <TaskModal 
        db={data} 
        ur={user} 
        taskId={modal.taskId} 
        planSum={planSum} 
        spent={spent}
        onClose={() => setModal(null)} 
        onSave={(t, isNew) => {
          const old = data.tasks.find(x => x.id === t.id);
          if (old && hasRole(user, 'admin')) {
            const changes = [];
            if (old.plannedHours !== t.plannedHours) changes.push(`Плановые часы: ${old.plannedHours ?? '—'} → ${t.plannedHours ?? '—'}`);
            if (old.status !== t.status) changes.push(`Статус: ${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[t.status].label}`);
            if (JSON.stringify(old.assigneeIds || []) !== JSON.stringify(t.assigneeIds || [])) changes.push(`Исполнители: ${(old.assigneeIds || []).map(id => empName(id)).join(', ')} → ${(t.assigneeIds || []).map(id => empName(id)).join(', ')}`);
            if (old.deadline !== t.deadline) changes.push(`Дедлайн: ${old.deadline ? fmtDMY(old.deadline) : '—'} → ${t.deadline ? fmtDMY(t.deadline) : '—'}`);
            if (changes.length > 0) {
              store.addAudit('Административное изменение задачи (прямое)', `${t.title}: ${changes.join('; ')}`);
            }
          }
          store.upsertTask(t);
          store.addAudit(isNew ? 'Создание задачи' : 'Изменение задачи', t.title);
          // ИЗМЕНЕНИЕ: уведомление при создании задачи
          if (isNew) {
            const assignees = t.assigneeIds || [];
            assignees.forEach(id => {
              if (id !== user.id) {
                store.addNotification(id, `Вам назначена задача "${t.title}" (проект ${data.projects.find(p => p.id === t.projectId)?.code || '—'}).`, { targetType: 'task', targetId: t.id });
              }
            });
          }
          setModal(null);
        }} 
        onDelete={(id) => { store.deleteTask(id); setModal(null); }} 
        onHoursReq={openHoursReq} 
        toast={(msg) => alert(msg)} 
        patchTask={store.upsertTask} 
        notify={(userId, text, target) => store.addNotification(userId, text, target)} 
        store={store} // ИЗМЕНЕНИЕ: передаём store
      />}
      {modal?.type === 'project' && <ProjectModal db={data} ur={user} projectId={modal.projectId} openTask={openTask} onClose={() => setModal(null)} onSave={(p, isNew) => { const old = data.projects.find(x => x.id === p.id); if (old && hasRole(user, 'admin')) { const changes = []; if (old.budget !== p.budget) changes.push(`Бюджет: ${old.budget ?? '—'} → ${p.budget ?? '—'}`); if (old.name !== p.name) changes.push(`Название: ${old.name} → ${p.name}`); if (old.managerId !== p.managerId) changes.push(`Ответственный: ${empName(old.managerId)} → ${empName(p.managerId)}`); if (old.status !== p.status) changes.push(`Статус: ${PROJECT_STATUSES[old.status]} → ${PROJECT_STATUSES[p.status]}`); if (changes.length > 0) { store.addAudit('Административное изменение проекта (прямое)', `${p.name}: ${changes.join('; ')}`); } } store.upsertProject(p); store.addAudit(isNew ? 'Создание проекта' : 'Изменение проекта', p.name); setModal(null); }} onDelete={(p) => { store.deleteProject(p.id); setModal(null); }} toast={(msg) => alert(msg)} />}
      {modal?.type === 'hours' && <HoursRequestModal db={data} ur={user} kind={modal.kind} targetId={modal.targetId} onClose={() => setModal(null)} onSubmit={(r) => { store.addHoursRequest(r); 
        // ИЗМЕНЕНИЕ: уведомление автору задачи
        const target = modal.kind === 'task' ? data.tasks.find(t => t.id === modal.targetId) : null;
        const authorId = target?.creatorId || (target?.history?.length > 0 ? target.history[0].who : null);
        if (authorId) {
          store.addNotification(authorId, `Запрос на изменение часов по ${modal.kind === 'task' ? 'задаче' : 'проекту'} "${target?.title || target?.name || ''}" от ${user.last} ${user.first}.`, { targetType: 'hours', targetId: r.id });
        } else {
          store.addNotification('e_kozlov', `Запрос на изменение часов`, { targetType: 'hours', targetId: r.id });
        }
        store.addAudit('Запрос изменения часов', `${r.oldH} → ${r.newH} ч`);
        setModal(null); 
      }} />}
      {modal?.type === 'roles' && <RolesModal db={data} setDb={(fn) => { store._data = fn(store._data); store._notify(); }} empId={modal.empId} onClose={() => setModal(null)} toast={(msg) => alert(msg)} audit={store.addAudit} />}
      {modal?.type === 'depts' && <DeptsModal db={data} setDb={(fn) => { store._data = fn(store._data); store._notify(); }} empId={modal.empId} onClose={() => setModal(null)} toast={(msg) => alert(msg)} audit={store.addAudit} />}
      {modal?.type === 'vacation' && <VacationModal db={data} ur={user} vacationId={modal.vacationId} forEmpId={modal.forEmpId || null} onClose={() => setModal(null)} onSave={(v, isNew) => { store.upsertVacation(v); store.addAudit(isNew ? 'Создание отпуска' : 'Изменение отпуска', `${v.empId} ${fmtDMY(v.start)}—${fmtDMY(v.end)}`); setModal(null); }} />}
      {modal?.type === 'delegation' && <DelegationModal db={data} ur={user} onClose={() => setModal(null)} onSubmit={(rd) => { store.upsertRoleDelegation(rd); store.addNotification(rd.toId, `Вам предложено временное принятие ролей: ${rd.roles.map(r => ROLES[r].label).join(", ")}.`, { targetType: 'delegation', targetId: rd.id }); store.addAudit('Запрос делегирования ролей', `${user.last} ${user.first} → ${rd.toId}`); setModal(null); }} />}
      {vacModalOpen && <VacNowModal db={data} onClose={() => setVacModalOpen(false)} toast={(msg) => alert(msg)} />}
    </div>
  );
}