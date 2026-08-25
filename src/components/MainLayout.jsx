import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAuth, useStore } from '../hooks';
import { hasRole, canExport, computeScope } from '../utils/permissions';
import { ICONS, Ic } from './Icons';
import { initials } from '../utils/date';
import NotifPanel from './NotifPanel';
import { useModals } from '../hooks/useModals';
import ModalRenderer from './ModalRenderer';
import * as Views from './views';
import Calendar from './Calendar';
import Gantt from './Gantt';

export default function MainLayout({ store, data, user }) {
  const { logout } = useStore();
  const [view, setView] = useState('kanban');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  const {
    modal,
    openTask,
    openProject,
    openHoursReq,
    openRoles,
    openDepts,
    openVacation,
    openDelegation,
    openVacNow,
    closeModal,
  } = useModals({ store, data, user });

  const scope = useMemo(() => computeScope(user, data), [user, data]);

  const navItems = [
    { id: 'kanban', label: 'Задачи', icon: ICONS.tasks },
    { id: 'gantt', label: 'Диаграмма Ганта', icon: ICONS.gantt },
    { id: 'calendar', label: 'Календарь', icon: ICONS.cal },
    { id: 'projects', label: 'Проекты', icon: ICONS.folder },
    // Персонал теперь виден всем
    { id: 'staff', label: 'Персонал', icon: ICONS.users },
    ...(canExport(user) || hasRole(user, 'kb_chief', 'head', 'project_lead', 'hr')
      ? [{ id: 'reports', label: 'Отчёты', icon: ICONS.chart }]
      : []),
    { id: 'archive', label: 'Архив', icon: ICONS.archive },
    { id: 'requests', label: 'Запросы и заявки', icon: ICONS.inbox },
    ...(hasRole(user, 'admin', 'director') ? [{ id: 'journal', label: 'Журнал аудита', icon: ICONS.book }] : []),
  ];

  const myNotifs = data.notifications.filter((n) => n.userId === user.id);
  const unread = myNotifs.filter((n) => !n.read).length;

  const handleNotificationNavigate = (notification) => {
    const { targetType, targetId } = notification;
    if (!targetType || !targetId) return;
    store.markNotificationRead(notification.id);
    switch (targetType) {
      case 'task':
        openTask(targetId, 'chat');
        break;
      case 'project':
        openProject(targetId);
        break;
      case 'hours':
        setView('requests');
        break;
      case 'vacation':
        openVacation(targetId);
        break;
      case 'delegation':
        setView('requests');
        break;
      case 'registration':
        setView('requests');
        break;
      default:
        break;
    }
    setNotifOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape' && notifOpen) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [notifOpen]);

  const renderView = () => {
    const commonProps = { db: data, ur: user, openTask, openProject, store };
    switch (view) {
      case 'kanban':
        return <Views.KanbanView {...commonProps} />;
      case 'gantt':
        return <Gantt {...commonProps} />;
      case 'calendar':
        return <Calendar {...commonProps} />;
      case 'projects':
        return <Views.ProjectsView {...commonProps} openHoursReq={openHoursReq} />;
      case 'cabinet':
        return (
          <Views.CabinetView
            store={store}
            data={data}
            user={user}
            openTask={openTask}
            openVacation={openVacation}
            openDelegation={openDelegation}
          />
        );
      case 'staff':
        return (
          <Views.StaffView
            db={data}
            ur={user}
            setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
            openRoles={openRoles}
            openDepts={openDepts}
            openVacation={openVacation}
          />
        );
      case 'reports':
        return <Views.ReportsView db={data} ur={user} />;
      case 'archive':
        return (
          <Views.ArchiveView
            db={data}
            ur={user}
            openTask={openTask}
            openProject={openProject}
            setArchiveMonths={(m) => { store._data.settings.archiveMonths = m; store._notify(); }}
            store={store}
          />
        );
      case 'requests':
        return (
          <Views.RequestsView
            db={data}
            setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
            ur={user}
            addAudit={store.addAudit.bind(store)}
            notify={store.addNotification.bind(store)}
          />
        );
      case 'journal':
        return <Views.JournalView db={data} ur={user} />;
      default:
        return null;
    }
  };

  return (
    <div className="shell">
      {/* Боковая панель */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-mark">АП</div>
          <div>
            <div className="logo-name">АвиаГоризонт</div>
            <div className="logo-sub">планирование и учёт времени</div>
          </div>
        </div>
        <div
          className="user-card"
          onClick={() => setView('cabinet')}
          style={{ cursor: 'pointer', marginBottom: '16px' }}
        >
          <div className="avatar">
            {user.photo ? (
              <img
                src={user.photo}
                alt="Аватар"
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              initials(user.first, user.last)
            )}
          </div>
          <div className="user-meta">
            <div className="user-name">{user.last} {user.first}</div>
            <div className="user-roles">{user.roles.join(' · ')}</div>
          </div>
          <button
            className="icon-btn dark"
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            title="Выйти"
          >
            <Ic d={ICONS.out} size={16} />
          </button>
        </div>
        <nav className="nav">
          {navItems.map((n) => (
            <button
              key={n.id}
              className={`nav-item${view === n.id ? ' on' : ''}`}
              onClick={() => setView(n.id)}
            >
              <Ic d={n.icon} /> <span className="nav-lbl">{n.label}</span>
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="env-badge">
            <Ic d={ICONS.shield} size={14} /> Демо · заглушка Java/PostgreSQL
          </div>
        </div>
      </aside>

      {/* Основная область */}
      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="page-title">
              {navItems.find((n) => n.id === view)?.label || 'Личный кабинет'}
            </h1>
            <div className="page-sub">
              Вторник, 4 августа 2026 · вы вошли как {user.last} {user.first}
            </div>
          </div>
          <div className="top-tools">
            <button className="btn ghost" onClick={openVacNow}>
              <Ic d={ICONS.beach} size={15} /> Сотрудники в отпусках
            </button>
            <div className="bell-wrap" ref={notifRef}>
              <button
                className={`icon-btn bell${unread ? ' has' : ''}`}
                onClick={() => setNotifOpen((v) => !v)}
              >
                <Ic d={ICONS.bell} size={17} />
                {unread > 0 && <span className="bell-count">{unread}</span>}
              </button>
              {notifOpen && (
                <NotifPanel
                  list={myNotifs}
                  setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
                  onNavigate={handleNotificationNavigate}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </div>
          </div>
        </header>

        <div className="content">{renderView()}</div>
      </main>

      {/* Рендеринг модальных окон */}
      {modal && (
        <ModalRenderer
          modal={modal}
          onClose={closeModal}
          db={data}
          ur={user}
          store={store}
          openTask={openTask}
          openProject={openProject}
          openHoursReq={openHoursReq}
          openRoles={openRoles}
          openDepts={openDepts}
          openVacation={openVacation}
          openDelegation={openDelegation}
          toast={(msg, type) => alert(msg)}
        />
      )}
    </div>
  );
}