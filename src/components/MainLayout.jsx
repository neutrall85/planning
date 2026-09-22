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
    { id: 'projects', label: 'Проекты', icon: ICONS.folder },
    { id: 'calendar', label: 'Календарь', icon: ICONS.cal },
    { id: 'gantt', label: 'Диаграмма Ганта', icon: ICONS.gantt },
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

  /**
   * Актуальный modal в ref.
   *
   * Эффект обработки route ниже зависит только от route: перезапускать
   * его на каждое изменение modal нельзя — это привело бы к лишним
   * вызовам openTask при каждом обновлении «той же» модалки.
   */
  const modalRef = useRef(modal);
  useEffect(() => { modalRef.current = modal; }, [modal]);

  /**
   * Закрыть модалку и вернуться в доступный view.
   *
   * Два предохранителя против самоподдерживающейся петли:
   *
   *   1. fallbackView проверяется на доступность. Если viewRef.current
   *      указывает на view, к которому у пользователя больше нет прав
   *      (сменилась роль, уволили в другой вкладке), раньше
   *      navigate('#/view/тот-же-недоступный') приводил к повторному
   *      срабатыванию эффекта [route] → denyAccess → navigate — цикл.
   *      Теперь при недоступности уходим на 'tasks' — оно всегда есть
   *      в VIEWS и доступно любой роли.
   *
   *   2. Проверка window.location.hash !== fallback перед navigate.
   *      Если адрес уже указывает на fallback (например, denyAccess
   *      вызван из-за смены прав, но URL ещё актуален), navigate — no-op,
   *      и эффект [desiredHash] не дёргается.
   */
  const denyAccess = useCallback(() => {
    showToast('Доступ запрещён', 'error');
    closeModal();
    const fallbackView = canAccessView(user, viewRef.current)
      ? viewRef.current
      : 'tasks';
    const fallback = buildRoute({ kind: ROUTE.VIEW, id: fallbackView });
    if (fallback && window.location.hash !== fallback) navigate(fallback);
  }, [showToast, closeModal, navigate, user]);

  const firstRouteWriteRef = useRef(true);

  /**
   * Флаг «route-эффект запланировал setView / closeModal / openTask».
   *
   * Проблема. Два эффекта — «route → state» и «state → URL» — работают в
   * одном коммите, но видят снимок значений на момент рендера. Обновления
   * состояния асинхронны, поэтому:
   *
   *   - route-эффект на смену #/view/gantt вызывает setView('gantt'),
   *     но view в его замыкании ещё 'tasks';
   *   - URL-эффект в этом же коммите вычисляет desiredHash из устаревшего
   *     view='tasks' и вызывает navigate('#/view/tasks'), откатывая URL;
   *   - на следующем рендере route снова = {view:'tasks'}, route-эффект
   *     возвращает view='tasks', URL-эффект снова navigate('#/view/gantt')
   *     — и так по кругу до Maximum update depth exceeded и
   *     Throttling navigation.
   *
   * Решение. Route-эффект объявлен РАНЬШЕ URL-эффекта и перед каждым
   * запланированным изменением состояния выставляет routeSyncPendingRef.
   * URL-эффект читает флаг и один круг пропускает navigate — этого круга
   * хватает, чтобы state-обновление закоммитилось и desiredHash
   * пересчитался из актуальных значений.
   *
   * Ref, а не state: значение должно быть видно в том же коммите, до
   * ре-рендера. Синхронная защёлка, сбрасывается URL-эффектом.
   */
  const routeSyncPendingRef = useRef(false);

  /**
   * Эффект «route → state». Объявлен первым — чтобы выставить
   * routeSyncPendingRef до того, как URL-эффект его проверит.
   */
  useEffect(() => {
    if (!route) return;

    if (route.kind === ROUTE.VIEW) {
      if (!VIEWS.includes(route.id)) return;
      if (!canAccessView(user, route.id)) { denyAccess(); return; }
      let changed = false;
      if (view !== route.id) { setView(route.id); changed = true; }
      if (modalRef.current) { closeModal(); changed = true; }
      if (changed) routeSyncPendingRef.current = true;
      return;
    }

    if (route.kind === ROUTE.TASK) {
      const task = tasks.find(t => t.id === route.id);

      // Случай «задачи нет» и случай «задача не видна» — разные.
      //
      // Задача удалена: закрытием/переключением модалки занимается
      // тот, кто её удалил, — ModalRenderer.handleTaskDelete вызывает
      // closeTaskWithReturn после store.deleteTask. На промежуточном
      // рендере (задача уже удалена, modal ещё указывает на неё, route
      // ещё указывает на неё, а closeTaskWithReturn вот-вот переключит
      // модалку на родителя) вызов denyAccess() здесь порождает гонку
      // двух navigate: наша попытка уйти на '#/view/...' конкурирует
      // с переходом '#/task/parentId/subtasks' из closeTaskWithReturn.
      // Победитель каждый раз разный, URL и route расходятся, эффект
      // [route] перезапускается — цикл «state → URL → state», в
      // консоли Maximum update depth exceeded и Throttling navigation.
      //
      // Задача есть, но не видна: это уже не транзитное состояние,
      // а реальная смена прав/scope — обрабатываем через denyAccess.
      if (!task) return;
      if (!taskVisible(user, scope, task, dbForScope)) { denyAccess(); return; }

      const m = modalRef.current;
      const mTab = m?.initialTab || DEFAULT_TAB[ROUTE.TASK];
      const routeTab = route.tab || DEFAULT_TAB[ROUTE.TASK];
      if (m?.type === 'task' && m.taskId === route.id && mTab === routeTab) return;
      routeSyncPendingRef.current = true;
      openTask(route.id, route.tab);
      return;
    }

    if (route.kind === ROUTE.PROJECT) {
      const project = projects.find(p => p.id === route.id);
      // Симметрично TASK: удалённый проект не повод для denyAccess —
      // переключение модалки делает closeProjectWithReturn из
      // ModalRenderer.handleProjectDelete.
      if (!project) return;
      if (!projectVisible(scope, project)) { denyAccess(); return; }

      const m = modalRef.current;
      const mTab = m?.initialTab || DEFAULT_TAB[ROUTE.PROJECT];
      const routeTab = route.tab || DEFAULT_TAB[ROUTE.PROJECT];
      if (m?.type === 'project' && m.projectId === route.id && mTab === routeTab) return;
      routeSyncPendingRef.current = true;
      openProject(route.id, route.tab);
      return;
    }

    // Share-ссылка на файл. Здесь «сущность пропала» — это уже
    // настоящая ошибка адреса: файл удалён или переехал вместе с
    // владельцем. Транзитного состояния не бывает — парного
    // «кто удалил, тот и закроет» у файловой ссылки нет, поэтому
    // denyAccess остаётся.
    if (route.kind === ROUTE.FILE) {
      const found = findFileById(dbForScope, route.id);
      if (!found) { denyAccess(); return; }
      if (found.owner === 'task') {
        if (!taskVisible(user, scope, found.entity, dbForScope)) { denyAccess(); return; }
        routeSyncPendingRef.current = true;
        openAtFile('task', found.entity.id, route.id);
        return;
      }
      if (!projectVisible(scope, found.entity)) { denyAccess(); return; }
      routeSyncPendingRef.current = true;
      openAtFile('project', found.entity.id, route.id);
      return;
    }

    if (route.kind === ROUTE.FOLDER) {
      const found = findFolderById(dbForScope, route.id);
      if (!found) { denyAccess(); return; }
      if (found.owner === 'task') {
        if (!taskVisible(user, scope, found.entity, dbForScope)) { denyAccess(); return; }
        routeSyncPendingRef.current = true;
        openAtFolder('task', found.entity.id, route.id);
        return;
      }
      if (!projectVisible(scope, found.entity)) { denyAccess(); return; }
      routeSyncPendingRef.current = true;
      openAtFolder('project', found.entity.id, route.id);
      return;
    }
  }, [route]);

  /**
   * Эффект «state → URL».
   *
   * Порядок объявления: ПОСЛЕ route-эффекта. В одном коммите route-эффект
   * успевает выставить routeSyncPendingRef, и этот эффект может его
   * прочитать и пропустить navigate.
   *
   * firstRouteWriteRef — отдельный предохранитель от ложной навигации
   * на самом первом рендере: если URL уже содержит '#/task/t01/form',
   * а view ещё 'tasks', не нужно переписывать адрес на '#/view/tasks'
   * только ради того, чтобы route-эффект тут же открыл модалку t01.
   */
  useEffect(() => {
    if (firstRouteWriteRef.current) {
      firstRouteWriteRef.current = false;
      return;
    }
    if (routeSyncPendingRef.current) {
      // Route-эффект планирует setView/closeModal/openTask. Navigate
      // в этом же коммите откатил бы свежий URL назад, к значению,
      // которое вычислено из ещё не применённого state. Пропускаем
      // круг — на следующем рендере desiredHash пересчитается из
      // актуальных modal/view и сойдётся с текущим URL.
      routeSyncPendingRef.current = false;
      return;
    }
    if (desiredHash) navigate(desiredHash);
  }, [desiredHash, navigate]);

  /**
   * Проверка видимости открытой в модалке сущности.
   * (без изменений — здесь различение уже сделано)
   */
  useEffect(() => {
    if (!modal) return;
    if (modal.type === 'task' && modal.taskId) {
      const task = tasks.find(t => t.id === modal.taskId);
      if (!task) return;
      if (!taskVisible(user, scope, task, dbForScope)) denyAccess();
      return;
    }
    if (modal.type === 'project' && modal.projectId) {
      const project = projects.find(p => p.id === modal.projectId);
      if (!project) return;
      if (!projectVisible(scope, project)) denyAccess();
    }
  }, [modal, tasks, projects, scope, user, dbForScope, denyAccess]);

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
          <div
            className="user-card cursor-pointer"
            onClick={() => navigate('#/view/cabinet')}
          >
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