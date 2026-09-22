// src/components/views/TasksList.jsx
import { TASK_STATUSES, PRIORITIES } from '../../utils/constants';
import { fmtDMY, TODAY } from '../../utils/date';
import FloatingMenu from '../FloatingMenu';
import { Ic, ICONS } from '../Icons';
import { buildTaskMenu } from '../menus';
import { chatKey } from '../../utils/chatKey';
import { UnreadBadge } from '../UnreadBadge';

export default function TasksList({
  tasks,
  db,
  user,
  unreadIndex,
  openTask,
  onMove,
  onDelete,
  onCopy,
  onMakeTemplate,
}) {
  if (!tasks.length) {
    return <div className="empty-note" style={{ padding: '40px 0' }}>Нет задач, соответствующих фильтрам</div>;
  }

  return (
    <div className="pj-grid">
      {tasks.map(task => {
        const project = db.projects.find(p => p.id === task.projectId);
        const assignee = task.assigneeId ? db.employees.find(e => e.id === task.assigneeId) : null;
        const factHours = task.logs.reduce((sum, log) => sum + log.hours, 0);
        const overdue = task.deadline && !['closed','cancelled'].includes(task.status) && task.deadline < TODAY;
        const status = TASK_STATUSES[task.status]?.label || task.status;
        const priority = PRIORITIES[task.priority]?.label || task.priority;
        const unread = unreadIndex.get(chatKey({ taskId: task.id })) || 0;

        const menuItems = buildTaskMenu({
          task,
          user,
          db,
          openTask,
          onMove,
          onDelete,
          onCopy,
          onMakeTemplate,
        });

        return (
          <FloatingMenu key={task.id} items={menuItems}>
            {({ anchorProps, buttonProps }) => (
              <div
                {...anchorProps}
                className="pj-card cursor-pointer relative"
                onClick={() => openTask(task.id)}
              >
                <button
                  {...buttonProps}
                  className="icon-btn kcard-menu-btn"
                  title="Действия"
                  aria-label={`Действия с задачей ${task.title}`}
                >
                  <Ic d={ICONS.more} size={15} />
                </button>

                <div className="pj-top">
                  <span className="pj-code" style={{ background: project?.color + '22', color: project?.color || '#64748b' }}>
                    {project?.code || 'Без проекта'}
                  </span>
                  <span className={`pj-st ${task.status}`}>{status}</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>{priority}</span>
                </div>
                <div className="pj-name">{task.title}</div>
                <div className="pj-row">
                  <span className="mut">Срок исполнения: </span> 
                  {task.deadline ? (
                    <span className={overdue ? 'red' : ''}>{fmtDMY(task.deadline)}</span>
                  ) : 'не задан'}
                </div>
                <div className="pj-row">
                  <span className="mut">Ответственный: </span>
                  <span>
                    {assignee ? `${assignee.last} ${assignee.first}` : 'не назначен'}
                  </span>
                </div>
                <div className="pj-budget mt-8">
                  <div className="pj-budget-row">
                    <span>Часы: <b>{factHours}</b> / <b>{task.plannedHours ?? '-'}</b></span>
                  </div>
                  {task.plannedHours > 0 && (
                    <div className="pj-progress">
                      <div 
                        className="pj-progress-fill" 
                        style={{ width: Math.min(100, (factHours / task.plannedHours) * 100) + '%', background: project?.color || '#3b82f6' }} 
                      />
                    </div>
                  )}
                </div>
                <div className="pj-foot">
                  {overdue && <span className="red text-12 font-semibold">Просрочено</span>}
                </div>
                <UnreadBadge
                  count={unread}
                  onClick={() => openTask(task.id, 'chat')}
                />
              </div>
            )}
          </FloatingMenu>
        );
      })}
    </div>
  );
}