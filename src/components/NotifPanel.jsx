import { } from 'react';
import { fmtDT } from '../utils/date';
import { Ic } from './Icons';

export default function NotifPanel({ list, store, onNavigate, onClose, currentUserId }) {
  const markAllRead = () => {
    if (store && store.markAllNotificationsRead && currentUserId) {
      store.markAllNotificationsRead(currentUserId);
    }
    // НЕ закрываем окно!
  };

  const handleClick = (item) => {
    if (onNavigate) onNavigate(item);
    if (onClose) onClose();
  };

  return (
    <div className="notif-pop">
      <div className="notif-head">
        <span>Уведомления</span>
        <button className="link" onClick={markAllRead}>прочитать все</button>
      </div>
      <div className="notif-list">
        {list.slice(0, 12).map(n => (
          <div
            key={n.id}
            className={`notif-item${n.read ? '' : ' new'}`}
            onClick={() => handleClick(n)}
          >
            <div>{n.text}</div>
            <div className="mut sm">{fmtDT(n.ts)}</div>
          </div>
        ))}
        {list.length === 0 && <div className="mut sm notif-empty">Нет уведомлений</div>}
      </div>
      <p className="mut sm notif-note">E-mail-дубли отправляются по настройкам профиля.</p>
    </div>
  );
}