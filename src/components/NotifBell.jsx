// src/components/NotifBell.jsx
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from '../context/StoreContext';
import NotifPanel from './NotifPanel';
import { Ic, ICONS } from './Icons';

/**
 * Колокольчик уведомлений.
 *
 * Сам подписан на срез notifications и сам держит состояние попапа.
 * MainLayout его не касается: смена счётчика непрочитанных или открытие
 * панели не дёргают корневое дерево.
 *
 * Навигация по клику передаётся снаружи (onNavigate) - она завязана на
 * openTask / openProject / openVacation / setView, которые живут в
 * MainLayout. Тащить их сюда значило бы пробрасывать четыре колбэка
 * ради того же результата.
 */
export default function NotifBell({ user, store, onNavigate }) {
  const notifications = useSelector(s => s.notifications);

  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const myNotifs = useMemo(
    () => notifications.filter(n => n.userId === user.id),
    [notifications, user.id],
  );
  const unread = useMemo(
    () => myNotifs.filter(n => !n.read).length,
    [myNotifs],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleNavigate = useCallback((notification) => {
    if (onNavigate) onNavigate(notification);
    // NotifPanel после onNavigate сам вызывает onClose - здесь
    // дублировать setOpen(false) не нужно.
  }, [onNavigate]);

  return (
    <div className="bell-wrap" ref={wrapRef}>
      <button
        className={`icon-btn bell${unread ? ' has' : ''}`}
        onClick={() => setOpen(v => !v)}
      >
        <Ic d={ICONS.bell} size={17} />
        {unread > 0 && <span className="bell-count">{unread}</span>}
      </button>
      {open && (
        <NotifPanel
          list={myNotifs}
          currentUserId={user.id}
          markAllRead={store.markAllNotificationsRead}
          onNavigate={handleNavigate}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}