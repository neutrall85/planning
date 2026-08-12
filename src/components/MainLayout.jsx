import React, { useState, useRef, useEffect } from 'react';
import { useAuth, useStore } from '../hooks';
import { hasRole, canCreateTask, canExport, canCreateProject, canChangeTaskStatus } from '../utils/permissions';
import { getEmpNameFromData, getPrimaryDeptFromData } from '../utils/string';
import { ICONS, Ic } from './Icons';
import { initials, TODAY, fmtDMY, fmtDT, fmtFullDate } from '../utils/date';
import { TASK_STATUSES, ROLES, PROJECT_STATUSES, PRIORITIES } from '../utils/constants';
import Kanban from './Kanban';
import TaskList from './TaskList';
import Gantt from './Gantt';
import Calendar from './Calendar';
import Projects from './Projects';
import ProjectsKanban from './ProjectsKanban';
import Cabinet from './Cabinet';
import Staff from './Staff';
import Reports from './Reports';
import Archive from './Archive';
import Requests from './Requests';
import Journal from './Journal';
import NotifPanel from './NotifPanel';
import { useToast } from './Toast';
import { 
  TaskModal, ProjectModal, HoursRequestModal, RolesModal, DeptsModal, 
  VacationModal, DelegationModal, VacNowModal, EmployeeEditModal 
} from './Modals';

export default function MainLayout({ store, data, user, toast }) {
  const { logout } = useStore();
  const [view, setView] = useState('tasks');
  const [modal, setModal] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [vacModalOpen, setVacModalOpen] = useState(false);
  const notifRef = useRef(null);
  
  const showToast = toast?.error || ((msg) => alert(msg));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape' && notifOpen) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [notifOpen]);

  const spent = (task) => task.logs.reduce((s, l) => s + l.hours, 0);
  const planSum = (projectId) => data.tasks.filter(t => t.projectId === projectId).reduce((s, t) => s + (t.plannedHours || 0), 0);

  const empName = (id) => getEmpNameFromData(data, id);
  const primaryDept = (emp) => getPrimaryDeptFromData(data, emp);

  const navItems = [
    { id: 'tasks', label: 'Задачи', icon: ICONS.kanban },
    { id: 'gantt', label: 'Диаграмма Ганта', icon: ICONS.gantt },
    { id: 'calendar', label: 'Календарь', icon: ICONS.cal },
    { id: 'projects', label: 'Проекты', icon: ICONS.folder },
    ...(hasRole(user, 'admin', 'director', 'economist', 'kb_chief', 'head', 'hr') ? [{ id: 'staff', label: 'Персонал', icon: ICONS.users }] : []),
    ...(canExport(user) || hasRole(user, 'kb_chief', 'head', 'project_lead', 'hr') ? [{ id: 'reports', label: 'Отчёты', icon: ICONS.chart }] : []),
    { id: 'archive', label: 'Архив', icon: ICONS.archive },
    { id: 'requests', label: 'Запросы и заявки', icon: ICONS.inbox },
    ...(hasRole(user, 'admin', 'director') ? [{ id: 'journal', label: 'Журнал', icon: ICONS.book }] : []),
  ];

  const myNotifs = data.notifications.filter(n => n.userId === user.id);
  const unread = myNotifs.filter(n => !n.read).length;

  const openTask = (taskId = null, initialTab = 'form', initialProjectId = null, vacationData = null) => setModal({ type: 'task', taskId, initialTab, initialProjectId, vacationData });
  const openProject = (projectId = null) => setModal({ type: 'project', projectId });
  const openHoursReq = (kind, targetId) => setModal({ type: 'hours', kind, targetId });
  const openRoles = (empId) => setModal({ type: 'roles', empId });
  const openDepts = (empId) => setModal({ type: 'depts', empId });
  const openVacation = (vacationId = null, forEmpId = null) => setModal({ type: 'vacation', vacationId, forEmpId });
  const openDelegation = () => setModal({ type: 'delegation' });
  const openEmployeeEdit = (empId) => setModal({ type: 'employeeEdit', empId });

  const [requestsTab, setRequestsTab] = useState('hours');
  const [tasksView, setTasksView] = useState('kanban');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [taskSortBy, setTaskSortBy] = useState("deadline");
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState('all');
  const [assigneeOptions, setAssigneeOptions] = useState([]); // динамический список
  const [projectsView, setProjectsView] = useState('kanban');
  const [showOnlyMyProjects, setShowOnlyMyProjects] = useState(false);
  const [projectSortBy, setProjectSortBy] = useState("name");

  const handleMoveTask = (taskId, newStatus) => {
    const task = data.tasks.find(t => t.id === taskId);
    if (!task) return;
    if ((newStatus === 'closed' || newStatus === 'cancelled') && !canChangeTaskStatus(user, task, newStatus, data)) {
      showToast('У вас нет прав на закрытие или отмену этой задачи.');
      return;
    }
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
    store.addAudit('Изменение статуса задачи', {
      task: task.title,
      status: `${TASK_STATUSES[task.status].label} → ${TASK_STATUSES[newStatus].label}`
    }, 'task', task.id);
  };

  const handleNotificationNavigate = (notification) => {
    const { targetType, targetId } = notification;
    if (!targetType || !targetId) return;
    store.markNotificationRead(notification.id);
    switch (targetType) {
      case 'task':
        openTask(targetId, 'form'); // <-- изменено с 'chat' на 'form'
        break;
      case 'project': openProject(targetId); break;
      case 'hours': 
        setRequestsTab('hours');
        setView('requests');
        break;
      case 'vacation': openVacation(targetId); break;
      case 'delegation':
        setRequestsTab('rd');
        setView('requests');
        break;
      case 'registration':
        setRequestsTab('reg');
        setView('requests');
        break;
      default: break;
    }
    setNotifOpen(false);
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">АП</div>
          <div><div className="logo-name">АвиаПлан.Инжиниринг</div><div className="logo-sub">планирование и учёт времени</div></div>
        </div>
        <div className="user-card" onClick={() => setView('cabinet')} style={{ cursor: 'pointer', marginBottom: '16px' }}>
          <div className="avatar">
            {user.photo ? (
              <img src={user.photo} alt="Аватар" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              initials(user.first, user.last)
            )}
          </div>
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
            <div className="page-sub">{fmtFullDate()} · вы вошли как {user.last} {user.first}</div>
          </div>
          <div className="top-tools">
            <button className="btn ghost" onClick={() => setVacModalOpen(true)}><Ic d={ICONS.beach} size={15} /> Сотрудники в отпусках</button>
            <div className="bell-wrap" ref={notifRef}>
              <button className={`icon-btn bell${unread ? ' has' : ''}`} onClick={() => setNotifOpen(v => !v)}>
                <Ic d={ICONS.bell} size={17} />
                {unread > 0 && <span className="bell-count">{unread}</span>}
              </button>
              {notifOpen && (
                <NotifPanel
                  list={myNotifs}
                  store={store}
                  onNavigate={handleNotificationNavigate}
                  onClose={() => setNotifOpen(false)}
                  currentUserId={user.id} // добавляем
                />
              )}
            </div>
          </div>
        </header>

        <div className="content">
          {view === 'tasks' && (
            <>
              <div className="toolbar" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="view-switcher">
                    <button className={`view-btn ${tasksView === 'list' ? 'active' : ''}`} onClick={() => setTasksView('list')}>
                      Список
                    </button>
                    <button className={`view-btn ${tasksView === 'kanban' ? 'active' : ''}`} onClick={() => setTasksView('kanban')}>
                      Канбан
                    </button>
                  </div>
                  <label className="dept-pick" style={{ margin: 0 }}>
                    <input type="checkbox" checked={showOnlyMyTasks} onChange={(e) => setShowOnlyMyTasks(e.target.checked)} />
                    <span style={{ fontSize: 13 }}>Только мои задачи</span>
                  </label>
                  <select className="inp sel sm" value={taskSortBy} onChange={(e) => setTaskSortBy(e.target.value)} style={{ minWidth: 180 }}>
                    <option value="deadline">По дате выполнения (возр.)</option>
                    <option value="deadlineDesc">По дате выполнения (убыв.)</option>
                    <option value="created">По дате создания</option>
                    <option value="alpha">По алфавиту (А-Я)</option>
                    <option value="alphaDesc">По алфавиту (Я-А)</option>
                    <option value="hours">По часам (возр.)</option>
                    <option value="hoursDesc">По часам (убыв.)</option>
                  </select>
                  
                  {/* Фильтр по исполнителям – показываем всем, кроме чистых исполнителей */}
                  {(!user.roles.includes('executor') || user.roles.length > 1) && (
                    <select className="inp sel sm" value={taskAssigneeFilter} onChange={(e) => setTaskAssigneeFilter(e.target.value)} style={{ minWidth: 180 }}>
                      <option value="all">Все исполнители</option>
                      {assigneeOptions.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.last} {emp.first}</option>
                      ))}
                    </select>
                  )}
                </div>
                {canCreateTask(user) && (
                  <button className="btn primary" onClick={() => openTask(null)}>
                    <Ic d={ICONS.plus} size={15} /> Задача
                  </button>
                )}
              </div>

              {tasksView === 'kanban' ? (
                <Kanban
                  db={data}
                  ur={user}
                  openTask={openTask}
                  onMove={handleMoveTask}
                  onNew={() => openTask(null)}
                  showOnlyMyTasks={showOnlyMyTasks}
                  sortBy={taskSortBy}
                  assigneeFilter={taskAssigneeFilter}
                  onAssigneeFilterChange={setTaskAssigneeFilter}
                  onAssigneeOptionsChange={setAssigneeOptions}
                />
              ) : (
                <TaskList
                  db={data}
                  ur={user}
                  openTask={openTask}
                  onMove={handleMoveTask}
                  onNew={() => openTask(null)}
                  showOnlyMyTasks={showOnlyMyTasks}
                  sortBy={taskSortBy}
                  assigneeFilter={taskAssigneeFilter}
                  onAssigneeFilterChange={setTaskAssigneeFilter}
                  onAssigneeOptionsChange={setAssigneeOptions}
                />
              )}
            </>
          )}
          {view === 'gantt' && <Gantt db={data} ur={user} openTask={openTask} openProject={openProject} patchTask={store.upsertTask} />}
          {view === 'calendar' && <Calendar db={data} ur={user} openTask={openTask} />}
          {view === 'projects' && (
            <>
              <div className="toolbar" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="view-switcher">
                    <button className={`view-btn ${projectsView === 'list' ? 'active' : ''}`} onClick={() => setProjectsView('list')}>
                      Список
                    </button>
                    <button className={`view-btn ${projectsView === 'kanban' ? 'active' : ''}`} onClick={() => setProjectsView('kanban')}>
                      Канбан
                    </button>
                  </div>
                  <label className="dept-pick" style={{ margin: 0 }}>
                    <input type="checkbox" checked={showOnlyMyProjects} onChange={(e) => setShowOnlyMyProjects(e.target.checked)} />
                    <span style={{ fontSize: 13 }}>Показать проекты с моими задачами</span>
                  </label>
                  <select className="inp sel sm" value={projectSortBy} onChange={(e) => setProjectSortBy(e.target.value)} style={{ minWidth: 180 }}>
                    <option value="name">По названию (А-Я)</option>
                    <option value="nameDesc">По названию (Я-А)</option>
                    <option value="created">По дате создания</option>
                    <option value="budget">По бюджету (возр.)</option>
                    <option value="budgetDesc">По бюджету (убыв.)</option>
                  </select>
                </div>
                {hasRole(user, 'admin', 'director', 'kb_chief', 'project_manager') && (
                  <button className="btn primary" onClick={() => openProject(null)}>
                    <Ic d={ICONS.plus} size={15} /> Проект
                  </button>
                )}
              </div>
              {projectsView === 'kanban' ? (
                <ProjectsKanban 
                  db={data} 
                  ur={user} 
                  openProject={openProject} 
                  showOnlyMyProjects={showOnlyMyProjects} 
                  sortBy={projectSortBy}
                  moveProject={(id, newStatus) => {
                    const project = data.projects.find(p => p.id === id);
                    if (project && project.status !== newStatus) {
                      store.upsertProject({...project, status: newStatus});
                    }
                  }}
                />
              ) : (
                <Projects 
                  db={data} 
                  ur={user} 
                  openProject={openProject} 
                  openHoursReq={openHoursReq} 
                  showOnlyMyProjects={showOnlyMyProjects} 
                  sortBy={projectSortBy}
                />
              )}
            </>
          )}
          {view === 'cabinet' && <Cabinet 
            store={store} 
            data={data} 
            user={user} 
            openTask={openTask} 
            openVacation={openVacation} 
            openDelegation={openDelegation}
            openEmployeeEdit={openEmployeeEdit}
            toast={toast}
          />}
          {view === 'staff' && <Staff 
            db={data} 
            store={store}
            ur={user} 
            openRoles={openRoles} 
            openDepts={openDepts} 
            openVacation={openVacation}
            openEmployeeEdit={openEmployeeEdit}
          />}
          {view === 'reports' && <Reports db={data} ur={user} />}
          {view === 'archive' && <Archive db={data} ur={user} openTask={openTask} openProject={openProject} setArchiveMonths={(m) => { store.setData({ ...store.data, settings: { ...store.data.settings, archiveMonths: m } }); }} 
            restoreTask={(id) => { 
              const t = data.tasks.find(x => x.id === id); 
              store.upsertTask({
                ...t, 
                archived: false, 
                archivedAt: null,
                closedAt: null,
                status: 'new'
              }); 
            }} 
            restoreProject={(id) => { 
              const p = data.projects.find(x => x.id === id); 
              store.upsertProject({
                ...p, 
                archived: false, 
                archivedAt: null,
                closedAt: null,
                status: 'active'
              }); 
              data.tasks.filter(t => t.projectId === id).forEach(t => {
                store.upsertTask({
                  ...t, 
                  archived: false, 
                  archivedAt: null,
                  closedAt: null,
                  status: 'new'
                });
              });
            }} 
          />}
          {view === 'requests' && <Requests 
            db={data} 
            store={store}
            ur={user} 
            initialTab={requestsTab} 
            addAudit={store.addAudit.bind(store)} 
          />}
          {view === 'journal' && <Journal db={data} ur={user} />}
        </div>
      </main>

      {modal?.type === 'task' && <TaskModal 
        db={data} 
        ur={user} 
        taskId={modal.taskId} 
        initialTab={modal.initialTab}
        initialProjectId={modal.initialProjectId}
        planSum={planSum} 
        spent={spent}
        onClose={() => setModal(null)} 
        onSave={(t, isNew) => {
          const old = data.tasks.find(x => x.id === t.id);
          
          let hasChanges = false;
          const changes = {};
          
          if (old) {
            if (old.title !== t.title) { hasChanges = true; changes.title = `${old.title} → ${t.title}`; }
            if (old.description !== t.description) { hasChanges = true; changes.description = `${old.description || ''} → ${t.description || ''}`; }
            if (old.projectId !== t.projectId) { hasChanges = true; changes.project = `${data.projects.find(p => p.id === old.projectId)?.code || '—'} → ${data.projects.find(p => p.id === t.projectId)?.code || '—'}`; }
            if (old.plannedHours !== t.plannedHours) { hasChanges = true; changes.plannedHours = `${old.plannedHours ?? '—'} → ${t.plannedHours ?? '—'}`; }
            if (old.status !== t.status) { hasChanges = true; changes.status = `${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[t.status].label}`; }
            if (JSON.stringify(old.assigneeIds || []) !== JSON.stringify(t.assigneeIds || [])) { hasChanges = true; changes.assignees = `${(old.assigneeIds || []).map(id => empName(id)).join(', ')} → ${(t.assigneeIds || []).map(id => empName(id)).join(', ')}`; }
            if (old.deadline !== t.deadline) { hasChanges = true; changes.deadline = `${old.deadline ? fmtDMY(old.deadline) : '—'} → ${t.deadline ? fmtDMY(t.deadline) : '—'}`; }
            if (old.priority !== t.priority) { hasChanges = true; changes.priority = `${PRIORITIES[old.priority]?.label} → ${PRIORITIES[t.priority]?.label}`; }
            if (old.dependencyId !== t.dependencyId || old.dependencyType !== t.dependencyType) { hasChanges = true; changes.dependency = 'изменена зависимость'; }
          }
          
          if (old && hasRole(user, 'admin') && hasChanges) {
            const details = Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join('; ');
            store.addAudit('Административное изменение задачи (прямое)', `Задача "${t.title}": ${details}`, 'task', t.id);
          }
          
          store.upsertTask(t);
          
          const actual = t.logs ? t.logs.reduce((s, l) => s + l.hours, 0) : 0;
          const projectCode = data.projects.find(p => p.id === t.projectId)?.code || '—';
          const assigneesStr = (t.assigneeIds || []).map(id => empName(id)).join(', ');
          const auditDetails = `Задача "${t.title}" в проекте ${projectCode}, плановые часы: ${t.plannedHours ?? '—'}, фактические часы: ${actual}, исполнители: ${assigneesStr || 'не назначены'}`;
          
          if (isNew) {
            store.addAudit('Создание задачи', auditDetails, 'task', t.id);
          } else if (hasChanges) {
            store.addAudit('Изменение задачи', auditDetails, 'task', t.id);
          }
          
          setModal(null);
        }} 
        onDelete={(id) => { 
          const task = data.tasks.find(t => t.id === id);
          store.deleteTask(id); 
          store.addAudit('Удаление задачи', `Задача "${task?.title}"`, 'task', id);
          setModal(null); 
        }} 
        onHoursReq={openHoursReq} 
        toast={toast} 
        patchTask={store.upsertTask} 
        notify={(userId, text, target) => store.addNotification(userId, text, target)} 
        store={store} 
      />}
      {modal?.type === 'project' && <ProjectModal 
        db={data} 
        ur={user} 
        projectId={modal.projectId} 
        openTask={openTask} 
        onClose={() => setModal(null)} 
        onSave={(p, isNew) => {
          const old = data.projects.find(x => x.id === p.id);
          if (old && hasRole(user, 'admin')) {
            const changes = {};
            if (old.budget !== p.budget) changes.budget = `${old.budget ?? '—'} → ${p.budget ?? '—'}`;
            if (old.name !== p.name) changes.name = `${old.name} → ${p.name}`;
            if (old.managerId !== p.managerId) changes.manager = `${empName(old.managerId)} → ${empName(p.managerId)}`;
            if (old.status !== p.status) changes.status = `${PROJECT_STATUSES[old.status]} → ${PROJECT_STATUSES[p.status]}`;
            if (Object.keys(changes).length) {
              const details = Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join('; ');
              store.addAudit('Административное изменение проекта (прямое)', `Проект "${p.name}": ${details}`, 'project', p.id);
            }
          }
          store.upsertProject(p);
          const auditDetails = `Проект "${p.name}" (код ${p.code}), бюджет: ${p.budget ?? '—'} ч`;
          store.addAudit(isNew ? 'Создание проекта' : 'Изменение проекта', auditDetails, 'project', p.id);
          setModal(null);
        }} 
        onDelete={(p) => { 
          store.deleteProject(p.id); 
          store.addAudit('Удаление проекта', `Проект "${p.name}"`, 'project', p.id);
          setModal(null); 
        }} 
        toast={toast} 
        store={store}
      />}
      {modal?.type === 'hours' && <HoursRequestModal db={data} ur={user} kind={modal.kind} targetId={modal.targetId} onClose={() => setModal(null)} onSubmit={(r) => { store.addHoursRequest(r); 
        const target = modal.kind === 'task' ? data.tasks.find(t => t.id === modal.targetId) : null;
        const authorId = target?.creatorId || (target?.history?.length > 0 ? target.history[0].who : null);
        if (authorId) {
          store.addNotification(authorId, `Запрос на изменение часов по ${modal.kind === 'task' ? 'задаче' : 'проекту'} "${target?.title || target?.name || ''}" от ${user.last} ${user.first}.`, { targetType: 'hours', targetId: r.id });
        } else {
          store.addNotification('e_kozlov', `Запрос на изменение часов`, { targetType: 'hours', targetId: r.id });
        }
        store.addAudit('Запрос изменения часов', {
          target: modal.kind === 'task' ? target?.title : target?.name,
          oldH: r.oldH,
          newH: r.newH,
        }, 'hoursRequest', r.id);
        setModal(null); 
      }} />}
      {modal?.type === 'roles' && <RolesModal db={data} store={store} empId={modal.empId} onClose={() => setModal(null)} toast={toast} audit={store.addAudit} />}
      {modal?.type === 'depts' && <DeptsModal db={data} store={store} empId={modal.empId} onClose={() => setModal(null)} toast={toast} audit={store.addAudit} />}
      {modal?.type === 'vacation' && <VacationModal db={data} ur={user} vacationId={modal.vacationId} forEmpId={modal.forEmpId || null} onClose={() => setModal(null)} onSave={(v, isNew) => { store.upsertVacation(v); store.addAudit(isNew ? 'Создание отпуска' : 'Изменение отпуска', { employee: empName(v.empId), period: `${fmtDMY(v.start)}—${fmtDMY(v.end)}` }, 'vacation', v.id); setModal(null); }} />}
      {modal?.type === 'delegation' && <DelegationModal db={data} ur={user} onClose={() => setModal(null)} onSubmit={(rd) => { store.upsertRoleDelegation(rd); store.addNotification(rd.toId, `Вам предложено временное принятие ролей: ${rd.roles.map(r => ROLES[r].label).join(", ")}.`, { targetType: 'delegation', targetId: rd.id }); store.addAudit('Создание делегирования ролей', { from: empName(rd.fromId), to: empName(rd.toId), roles: rd.roles.join(', ') }, 'delegation', rd.id); setModal(null); }} />}
      {modal?.type === 'employeeEdit' && (
        <EmployeeEditModal
          db={data}
          store={store}
          ur={user}
          empId={modal.empId}
          onClose={() => setModal(null)}
          toast={toast}
        />
      )}
      {vacModalOpen && <VacNowModal db={data} onClose={() => setVacModalOpen(false)} toast={toast} />}
    </div>
  );
}