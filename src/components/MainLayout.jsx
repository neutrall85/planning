// src/components/MainLayout.jsx
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useStore, useSelector } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { useModals } from '../hooks/useModals';
import { useHashRoute } from '../hooks/useHashRoute';
import ModalRenderer from './ModalRenderer';
import NotifBell from './NotifBell';
import { Ic, ICONS } from './Icons';
import TasksView from './views/TasksView';
import Gantt from './Gantt';
import Calendar from './Calendar';
import ProjectsView from './views/ProjectsView';
import TemplatesView from './views/TemplatesView';
import CabinetView from './views/CabinetView';
import StaffView from './views/StaffView';
import ReportsView from './views/ReportsView';
import ArchiveView from './views/ArchiveView';
import { RequestsView } from './views/RequestsView';
import JournalView from './views/JournalView';
import {
  hasRole,
  canExport,
  canAccessView,
  computeScope,
  taskVisible,
  projectVisible,
} from '../utils/permissions';
import {
  ROUTE,
  VIEWS,
  DEFAULT_TAB,
  buildRoute,
} from '../utils/routes';
import { findFileById, findFolderById } from '../utils/fileLinks';

/**
 * Маппинг targetType уведомления → вкладка раздела «Запросы и заявки».
 *
 * Запросы на изменение (changeRequest) здесь отсутствуют осознанно:
 * у них вкладка определяется конкретным changeKind, и notification несёт
 * его в поле targetTab. Обработка changeRequest — отдельная ветка в
 * handleNotificationNavigate.
 */
const REQUESTS_TAB_BY_NOTIF_TYPE = Object.freeze({
  delegation: 'rd',
  registration: 'reg',
});

function MainLayout({ store, user }) {
  const { logout } = useStore();
  const { showToast } = useToast();
  const tasks = useSelector(s => s.tasks);
  const projects = useSelector(s => s.projects);
  const employees = useSelector(s => s.employees);
  const departments = useSelector(s => s.departments);

  const [view, setView] = useState('tasks');
  const [requestsTab, setRequestsTab] = useState('hours');

  const {
    modal, openTask, openProject, openProjectAccess, openChangeReq,
    openRoles, openDepts, openVacation, openDelegation, openVacNow,
    openYearCalendar, openEmployeeTasks, openCopyTask, openCopyProject,
    openTemplateFromTask, openTemplateFromProject, closeModal, setModalTab,
    openAtFile, openAtFolder,
  } = useModals({ store, user });

  const { route, navigate } = useHashRoute();

  const dbForScope = useMemo(() => ({
    tasks, projects, employees, departments,
  }), [tasks, projects, employees, departments]);

  const scope = useMemo(
    () => computeScope(user, dbForScope),
    [user, dbForScope],
  );

  const navItems = useMemo(() => [
    { id: 'tasks', label: 'Задачи', icon: ICONS.tasks },
    { id: 'gantt', label: 'Диаграмма Ганта', icon: ICONS.gantt },
    { id: 'calendar', label: 'Календарь', icon: ICONS.cal },
    { id: 'projects', label: 'Проекты', icon: ICONS.folder },
    { id: 'templates', label: 'Шаблоны', icon: ICONS.bookmark },
    { id: 'staff', label: 'Персонал', icon: ICONS.users },
    ...(canExport(user) || hasRole(user, 'kb_chief', 'head', 'project_lead', 'hr')
      ? [{ id: 'reports', label: 'Отчёты', icon: ICONS.chart }]
      : []),
    { id: 'archive', label: 'Архив', icon: ICONS.archive },
    { id: 'requests', label: 'Запросы и заявки', icon: ICONS.inbox },
    ...(hasRole(user, 'admin', 'director')
      ? [{ id: 'journal', label: 'Журнал аудита', icon: ICONS.book }]
      : []),
  ], [user]);

  const handleNotificationNavigate = useCallback((notification) => {
    const { targetType, targetId, targetTab } = notification;
    if (!targetType || !targetId) return;
    store.markNotificationRead(notification.id);

    // Запросы на изменение: вкладка — конкретный changeKind, он лежит
    // в targetTab. Если по какой-то причине её нет — открываем 'hours'
    // (самый частый вид), чтобы клик не пропадал зря.
    if (targetType === 'changeRequest') {
      setRequestsTab(targetTab || 'hours');
      setView('requests');
      return;
    }

    const requestsTabForType = REQUESTS_TAB_BY_NOTIF_TYPE[targetType];
    if (requestsTabForType) {
      setRequestsTab(requestsTabForType);
      setView('requests');
      return;
    }

    switch (targetType) {
      case 'task':
        openTask(targetId, targetTab || 'form');
        break;
      case 'project':
        openProject(targetId, targetTab || 'info');
        break;
      case 'vacation':
        openVacation(targetId);
        break;
    }
  }, [store, openTask, openProject, openVacation]);

  const handleNavClick = useCallback((id) => {
    if (id === 'requests') setRequestsTab('hours');
    navigate(`#/view/${id}`);
  }, [navigate]);

  const desiredHash = useMemo(() => {
    if (modal?.type === 'task' && modal.taskId) {
      return buildRoute({
        kind: ROUTE.TASK,
        id: modal.taskId,
        tab: modal.initialTab || DEFAULT_TAB[ROUTE.TASK],
      });
    }
    if (modal?.type === 'project' && modal.projectId) {
      return buildRoute({
        kind: ROUTE.PROJECT,
        id: modal.projectId,
        tab: modal.initialTab || DEFAULT_TAB[ROUTE.PROJECT],
      });
    }
    if (modal) return '';
    return buildRoute({ kind: ROUTE.VIEW, id: view });
  }, [modal, view]);

  const viewRef = useRef(view);
  useEffect(() => { viewRef.current = view; }, [view]);

  const denyAccess = useCallback(() => {
    showToast('Доступ запрещён', 'error');
    closeModal();
    const fallback = buildRoute({ kind: ROUTE.VIEW, id: viewRef.current });
    if (fallback) navigate(fallback);
  }, [showToast, closeModal, navigate]);

  const firstRouteWriteRef = useRef(true);
  useEffect(() => {
    if (firstRouteWriteRef.current) {
      firstRouteWriteRef.current = false;
      return;
    }
    if (desiredHash) navigate(desiredHash);
  }, [desiredHash, navigate]);

  useEffect(() => {
    if (!route) return;
    if (route.kind === ROUTE.VIEW) {
      if (!VIEWS.includes(route.id)) return;
      if (!canAccessView(user, route.id)) { denyAccess(); return; }
      if (view !== route.id) setView(route.id);
      if (modal) closeModal();
      return;
    }
    if (route.kind === ROUTE.TASK) {
      const task = tasks.find(t => t.id === route.id);
      if (!task || !taskVisible(user, scope, task, dbForScope)) { denyAccess(); return; }
      if (modal?.type === 'task' && modal.taskId === route.id && modal.initialTab === route.tab) return;
      openTask(route.id, route.tab);
      return;
    }
    if (route.kind === ROUTE.PROJECT) {
      const project = projects.find(p => p.id === route.id);
      if (!project || !projectVisible(scope, project)) { denyAccess(); return; }
      if (modal?.type === 'project' && modal.projectId === route.id && modal.initialTab === route.tab) return;
      openProject(route.id, route.tab);
      return;
    }
    if (route.kind === ROUTE.FILE) {
      const found = findFileById(dbForScope, route.id);
      if (!found) { denyAccess(); return; }
      if (found.owner === 'task') {
        if (!taskVisible(user, scope, found.entity, dbForScope)) { denyAccess(); return; }
        openAtFile('task', found.entity.id, route.id);
        return;
      }
      if (!projectVisible(scope, found.entity)) { denyAccess(); return; }
      openAtFile('project', found.entity.id, route.id);
      return;
    }
    if (route.kind === ROUTE.FOLDER) {
      const found = findFolderById(dbForScope, route.id);
      if (!found) { denyAccess(); return; }
      if (found.owner === 'task') {
        if (!taskVisible(user, scope, found.entity, dbForScope)) { denyAccess(); return; }
        openAtFolder('task', found.entity.id, route.id);
        return;
      }
      if (!projectVisible(scope, found.entity)) { denyAccess(); return; }
      openAtFolder('project', found.entity.id, route.id);
      return;
    }
  }, [route]);

  useEffect(() => {
    if (!modal) return;
    if (modal.type === 'task' && modal.taskId) {
      const task = tasks.find(t => t.id === modal.taskId);
      if (!task || !taskVisible(user, scope, task, dbForScope)) denyAccess();
      return;
    }
    if (modal.type === 'project' && modal.projectId) {
      const project = projects.find(p => p.id === modal.projectId);
      if (!project || !projectVisible(scope, project)) denyAccess();
    }
  }, [modal, tasks, projects, scope, user]);

  const renderView = () => {
    const common = { ur: user, openTask, openProject, store };
    switch (view) {
      case 'tasks':
        return <TasksView {...common} openCopyTask={openCopyTask} openTemplateFromTask={openTemplateFromTask} />;
      case 'gantt':
        return <Gantt {...common} />;
      case 'calendar':
        return <Calendar {...common} openCopyTask={openCopyTask} openTemplateFromTask={openTemplateFromTask} />;
      case 'projects':
        return <ProjectsView {...common} openCopyProject={openCopyProject} openTemplateFromProject={openTemplateFromProject} openProjectAccess={openProjectAccess} />;
      case 'templates':
        return <TemplatesView />;
      case 'cabinet':
        return <CabinetView store={store} user={user} openTask={openTask} openVacation={openVacation} openDelegation={openDelegation} openEmployeeTasks={openEmployeeTasks} />;
      case 'staff':
        return <StaffView store={store} ur={user} openRoles={openRoles} openDepts={openDepts} openVacation={openVacation} />;
      case 'reports':
        return <ReportsView ur={user} />;
      case 'archive':
        return <ArchiveView ur={user} openTask={openTask} openProject={openProject} setArchiveMonths={store.setArchiveMonths} store={store} />;
      case 'requests':
        return <RequestsView key={requestsTab} ur={user} initialTab={requestsTab} />;
      case 'journal':
        return <JournalView ur={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">АП</div>
          <div>
            <div className="logo-name">АвиаГоризонт</div>
            <div className="logo-sub">планирование и учёт времени</div>
          </div>
        </div>
        <nav className="nav">
          {navItems.map(n => (
            <button
              key={n.id}
              className={`nav-item${view === n.id ? ' on' : ''}`}
              onClick={() => handleNavClick(n.id)}
            >
              <Ic d={n.icon} /> <span className="nav-lbl">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="user-card cursor-pointer" onClick={() => navigate('#/view/cabinet')}>
            <div className="avatar">
              {user.photo
                ? <img src={user.photo} alt="Аватар" className="user-card-photo" />
                : user.last[0] + user.first[0]}
            </div>
            <div className="user-meta">
              <div className="user-name">{user.last} {user.first}</div>
              <div className="user-roles">{user.roles.join(' · ')}</div>
            </div>
            <button
              className="icon-btn dark"
              onClick={(e) => { e.stopPropagation(); logout(); }}
              title="Выйти"
            >
              <Ic d={ICONS.out} size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">
              {navItems.find(n => n.id === view)?.label || 'Личный кабинет'}
            </h1>
            <div className="page-sub">
              {new Date().toLocaleDateString('ru-RU', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })} · вы вошли как {user.last} {user.first}
            </div>
          </div>
          <div className="top-tools">
            <button className="btn ghost" onClick={openVacNow}>
              <Ic d={ICONS.beach} size={15} /> Сотрудники в отпусках
            </button>
            <button className="btn ghost" onClick={openYearCalendar}>
              <Ic d={ICONS.cal} size={15} /> Производственный календарь
            </button>
            <NotifBell user={user} store={store} onNavigate={handleNotificationNavigate} />
          </div>
        </header>
        <div className="content">{renderView()}</div>
      </main>

      {modal && (
        <ModalRenderer
          key={modal._seq}
          modal={modal}
          onClose={closeModal}
          ur={user}
          store={store}
          openTask={openTask}
          openProject={openProject}
          openChangeReq={openChangeReq}
          openRoles={openRoles}
          openDepts={openDepts}
          openVacation={openVacation}
          openDelegation={openDelegation}
          openEmployeeTasks={openEmployeeTasks}
          openCopyTask={openCopyTask}
          openCopyProject={openCopyProject}
          onTabChange={setModalTab}
          toast={showToast}
        />
      )}
    </div>
  );
}

export default MainLayout;