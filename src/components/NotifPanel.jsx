import { fmtDT, fmtDMY, iso } from '../utils/date';
import { Ic, ICONS } from './Icons';

/**
 * Иконка уведомления по его типу.
 *
 * Для старых типов — прямая карта. Для changeRequest — функция от
 * targetTab: уведомления о сроке и о часах принадлежат одному типу
 * (changeRequest), но визуально должны различаться — иначе пользователь
 * не отличит «просят сдвинуть срок» от «просят добавить часов».
 *
 * Ключ hours оставлен: если в сторе остались уведомления от старой
 * схемы (до переезда на changeRequest), они не потеряют иконку.
 */
const iconForNotification = (n) => {
  if (n.targetType === 'changeRequest') {
    return n.targetTab === 'deadline' ? ICONS.cal : ICONS.clock;
  }
  return TYPE_ICONS[n.targetType] || TYPE_ICONS.default;
};

const TYPE_ICONS = {
  task: ICONS.tasks,
  project: ICONS.folder,
  hours: ICONS.clock,
  vacation: ICONS.beach,
  delegation: ICONS.swap,
  registration: ICONS.user,
  employee: ICONS.users,
  default: ICONS.bell,
};

export default function NotifPanel({ list, currentUserId, markAllRead, onNavigate, onClose }) {
  const handleClick = (item) => {
    if (onNavigate) onNavigate(item);
    if (onClose) onClose();
  };

  const handleMarkAll = () => {
    if (markAllRead) markAllRead(currentUserId);
  };

  // Группировка по дням
  const groups = [];
  const today = iso(new Date());
  const sorted = [...list].sort((a, b) => b.ts - a.ts);

  let currentGroup = null;
  sorted.forEach(n => {
    const day = iso(new Date(n.ts));
    const label = day === today ? 'Сегодня' : fmtDMY(day);
    if (!currentGroup || currentGroup.label !== label) {
      currentGroup = { label, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(n);
  });

  const hasUnread = list.some(n => !n.read);

  return (
    <div className="notif-pop">
      <div className="notif-head">
        <span>Уведомления</span>
        {hasUnread && (
          <button className="link" onClick={handleMarkAll}>прочитать все</button>
        )}
      </div>
      <div className="notif-list">
        {groups.map(g => (
          <div key={g.label}>
            <div className="notif-group-label">{g.label}</div>
            {g.items.map(n => (
              <div
                key={n.id}
                className={`notif-item${n.read ? '' : ' new'}`}
                onClick={() => handleClick(n)}
              >
                <div className="notif-icon">
                  <Ic d={iconForNotification(n)} size={14} />
                </div>
                <div className="notif-content">
                  <div className="notif-text">{n.text}</div>
                  <div className="mut sm">{fmtDT(n.ts)}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
        {list.length === 0 && <div className="mut sm notif-empty">Нет уведомлений</div>}
      </div>
      <p className="mut sm notif-note">E-mail-дубли отправляются по настройкам профиля.</p>
    </div>
  );
}