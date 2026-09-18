// src/components/MainLayout.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useStore, useSelector } from '../context/StoreContext';
import { useHashRoute } from '../hooks/useHashRoute';
import {
  hasRole,
  canExport,
  computeScope,
  taskVisible,
  projectVisible,
} from '../utils/permissions';
import { ICONS, Ic } from './Icons';
import { initials } from '../utils/date';
import NotifBell from './NotifBell';
import { useModals } from '../hooks/useModals';
import ModalRenderer from './ModalRenderer';
import * as Views from './views';
import Calendar from './Calendar';
import Gantt from './Gantt';
import { useToast } from '../context/ToastContext';
import { ROUTE, DEFAULT_TAB, buildRoute } from '../utils/routes';

export default function MainLayout({ store, user }) {
  const { logout } = useStore();
  const { showToast } = useToast();

  // Подписки на срезы, которые нужны каркасу - только для route-guard'ов.
  // Колокольчик уведомлений сам подписан на notifications (см. NotifBell).
  const tasks         = useSelector(s => s.tasks);
  const projects      = useSelector(s => s.projects);
  const employees     = useSelector(s => s.employees);
  const departments   = useSelector(s => s.departments);

  const [view, setView] = useState('tasks');

  const {
    modal,
    openTask, openProject, openHoursReq, openRoles, openDepts,
    openVacation, openDelegation, openVacNow, openYearCalendar,
    openEmployeeTasks, openCopyTask, openCopyProject,
    openTemplateFromTask, openTemplateFromProject,
    closeModal, setModalTab,
  } = useModals({ store, user });

  const { route, navigate } = useHashRoute();

  // Минимальный db для computeScope / taskVisible / projectVisible.
  const dbForScope = useMemo(
    () => ({ tasks, projects, employees, departments }),
    [tasks, projects, employees, departments],
  );
  const scope = useMemo(() => computeScope(user, dbForScope), [user, dbForScope]);

  const navItems = useMemo(() => [
    { id: 'tasks',     label: 'Задачи',                 icon: ICONS.tasks },
    { id: 'gantt',     label: 'Диаграмма Ганта',        icon: ICONS.gantt },
    { id: 'calendar',  label: 'Календарь',              icon: ICONS.cal },
    { id: 'projects',  label: 'Проекты',                icon: ICONS.folder },
    { id: 'templates', label: 'Шаблоны',                icon: ICONS.bookmark },
    { id: 'staff',     label: 'Персонал',               icon: ICONS.users },
    ...(canExport(user) || hasRole(user, 'kb_chief', 'head', 'project_lead', 'hr')
      ? [{ id: 'reports', label: 'Отчёты', icon: ICONS.chart }]
      : []),
    { id: 'archive',   label: 'Архив',                  icon: ICONS.archive },
    { id: 'requests',  label: 'Запросы и заявки',       icon: ICONS.inbox },
    ...(hasRole(user, 'admin', 'director')
      ? [{ id: 'journal', label: 'Журнал аудита', icon: ICONS.book }]
      : []),
  ], [user]);

  // Навигация по клику на уведомление. Живёт здесь, потому что замкнута
  // на openTask / openProject / openVacation / setView. NotifBell получает
  // её пропсом - колбэк стабилен (store - синглтон, open* - useCallback,
  // setView - сеттер useState), поэтому не провоцирует ре-рендер колокольчика.
  const handleNotificationNavigate = useCallback((notification) => {
    const { targetType, targetId } = notification;
    if (!targetType || !targetId) return;
    store.markNotificationRead(notification.id);
    switch (targetType) {
      case 'task':         openTask(targetId, 'chat'); break;
      case 'project':      openProject(targetId); break;
      case 'hours':        setView('requests'); break;
      case 'vacation':     openVacation(targetId); break;
      case 'delegation':   setView('requests'); break;
      case 'registration': setView('requests'); break;
      default: break;
    }
  }, [store, openTask, openProject, openVacation]);

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

  // URL → state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!route) return;

    if (route.kind === ROUTE.VIEW) {
      if (!navItems.some(n => n.id === route.id)) return;
      if (view !== route.id) setView(route.id);
      if (modal) closeModal();
      return;
    }

    if (route.kind === ROUTE.TASK) {
      const task = tasks.find(t => t.id === route.id);
      if (!task || !taskVisible(user, scope, task, dbForScope)) {
        denyAccess();
        return;
      }
      if (modal?.type === 'task' && modal.taskId === route.id && modal.initialTab === route.tab) return;
      openTask(route.id, route.tab);
      return;
    }

    if (route.kind === ROUTE.PROJECT) {
      const project = projects.find(p => p.id === route.id);
      if (!project || !projectVisible(scope, project)) {
        denyAccess();
        return;
      }
      if (modal?.type === 'project' && modal.projectId === route.id && modal.initialTab === route.tab) return;
      openProject(route.id, route.tab);
    }
  }, [route]);

  // Права отозваны, пока модалка открыта.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!modal) return;

    if (modal.type === 'task' && modal.taskId) {
      const task = tasks.find(t => t.id === modal.taskId);
      if (!task || !taskVisible(user, scope, task, dbForScope)) {
        denyAccess();
      }
      return;
    }

    if (modal.type === 'project' && modal.projectId) {
      const project = projects.find(p => p.id === modal.projectId);
      if (!project || !projectVisible(scope, project)) {
        denyAccess();
      }
    }
  }, [modal, tasks, projects, scope, user]);

  const renderView = () => {
    const common = { ur: user, openTask, openProject, store };
    switch (view) {
      case 'tasks':
        return (
          <Views.TasksView
            {...common}
            openCopyTask={openCopyTask}
            openTemplateFromTask={openTemplateFromTask}
          />
        );
      case 'gantt':
        return <Gantt {...common} />;
      case 'calendar':
        return (
          <Calendar
            {...common}
            openCopyTask={openCopyTask}
            openTemplateFromTask={openTemplateFromTask}
          />
        );
      case 'projects':
        return (
          <Views.ProjectsView
            {...common}
            openCopyProject={openCopyProject}
            openTemplateFromProject={openTemplateFromProject}
          />
        );
      case 'templates':
        return <Views.TemplatesView />;
      case 'cabinet':
        return (
          <Views.CabinetView
            store={store}
            user={user}
            openTask={openTask}
            openVacation={openVacation}
            openDelegation={openDelegation}
          />
        );
      case 'staff':
        return (
          <Views.StaffView
            store={store}
            ur={user}
            openRoles={openRoles}
            openDepts={openDepts}
            openVacation={openVacation}
          />
        );
      case 'reports':
        return <Views.ReportsView ur={user} />;
      case 'archive':
        return (
          <Views.ArchiveView
            ur={user}
            openTask={openTask}
            openProject={openProject}
            setArchiveMonths={store.setArchiveMonths}
            store={store}
          />
        );
      case 'requests':
        return <Views.RequestsView ur={user} />;
      case 'journal':
        return <Views.JournalView ur={user} />;
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
            <div className="logo-name">Авиагоризонт</div>
            <div className="logo-sub">планирование и учёт времени</div>
          </div>
        </div>
        <nav className="nav">
          {navItems.map((n) => (
            <button
              key={n.id}
              className={`nav-item${view === n.id ? ' on' : ''}`}
              onClick={() => navigate(`#/view/${n.id}`)}
            >
              <Ic d={n.icon} /> <span className="nav-lbl">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div
            className="user-card cursor-pointer"
            onClick={() => navigate('#/view/cabinet')}
          >
            <div className="avatar">
              {user.photo ? (
                <img src={user.photo} alt="Аватар" className="user-card-photo" />
              ) : initials(user.first, user.last)}
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
          <div className="env-badge">
            <Ic d={ICONS.shield} size={14} /> Демо · заглушка Java/PostgreSQL
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
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {' '}· вы вошли как {user.last} {user.first}
            </div>
          </div>
          <div className="top-tools">
            <button className="btn ghost" onClick={openVacNow}>
              <Ic d={ICONS.beach} size={15} /> Сотрудники в отпусках
            </button>
            <button className="btn ghost" onClick={openYearCalendar}>
              <Ic d={ICONS.cal} size={15} /> Производственный календарь
            </button>
            <NotifBell
              user={user}
              store={store}
              onNavigate={handleNotificationNavigate}
            />
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
          openHoursReq={openHoursReq}
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