// components/Gantt/TaskRow.jsx
import { TASK_STATUSES, PRIORITIES } from '../../utils/constants';
import { fmtD, fmtDMY } from '../../utils/date';
import Avatar from '../Avatar';
import { computeTaskIndices } from '../../utils/ganttHelpers';

const TaskRow = ({
  task,
  level,
  hasChildren,
  expanded,
  onToggle,
  days,
  DW,
  viewStart,
  viewEnd,
  db,
  openTask,
  getTaskSpent,
  vacOverlap,
  isCritical,
}) => {
  const assignee = task.assigneeId ? db.employees.find(e => e.id === task.assigneeId) : null;
  const project = db.projects.find(p => p.id === task.projectId);

  const indices = computeTaskIndices(task, days, viewStart, viewEnd);
  if (!indices) return null;
  const { sIdx, eIdx } = indices;

  const left = sIdx * DW + 2;
  const w = Math.max((eIdx - sIdx + 1) * DW - 4, DW - 8);
  const sp = getTaskSpent(task);
  const pct = Math.min(100, (sp / Math.max(1, task.plannedHours || 0)) * 100);
  const fillWidth = pct > 0 ? Math.max(pct, 2) : 0;
  const vac = assignee ? vacOverlap(assignee.id, task.start, task.deadline) : null;
  const isMilestone = task.start === task.deadline;
  const priorityColor = PRIORITIES[task.priority]?.color || '#64748b';
  const bgColor = priorityColor + '33';

  const tooltipLines = [
    `${task.title}`,
    `Проект: ${project?.code || '—'}`,
    `Статус: ${TASK_STATUSES[task.status]?.label || task.status}`,
    `Приоритет: ${PRIORITIES[task.priority]?.label || task.priority}`,
    `План: ${task.plannedHours ?? '—'} ч, Факт: ${sp} ч`,
    `Срок: ${fmtD(task.start)} — ${fmtD(task.deadline)}`,
    ...(assignee ? [`Исполнитель: ${assignee.last} ${assignee.first}`] : []),
    ...(vac ? [`⚠️ В отпуске ${fmtDMY(vac.start)}–${fmtDMY(vac.end)}`] : []),
    ...(isCritical ? ['🔴 Критическая задача'] : []),
  ].join('\n');

  return (
    <div className={`gantt-row${isCritical ? ' gantt-critical' : ''} relative`}>
      <div 
        className="gantt-label" 
        onClick={() => openTask(task.id)}
        style={{ '--indent-level': level * 20 + 'px' }}
      >
        <div className="flex items-center gap-1">
          {hasChildren && (
            <button
              className={`gantt-expand-btn${expanded ? ' expanded' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(task.id);
              }}
              title={expanded ? 'Свернуть' : 'Развернуть'}
            >
              ▶
            </button>
          )}
          <span className={`gtitle${task.status === 'cancelled' ? ' dim' : ''}`}>
            {task.title}
          </span>
        </div>
        <span className="gsub">
          {assignee && <Avatar employee={assignee} size="xs" />} · {task.plannedHours ?? '—'} ч · {TASK_STATUSES[task.status]?.label || task.status}
        </span>
      </div>
      <div className="gantt-track">
        {isMilestone ? (
          <div className="gantt-milestone" style={{ left: left + w/2 - 8, top: 8, borderColor: priorityColor }} title={tooltipLines} />
        ) : (
          <div
            className="gbar"
            style={{
              '--bar-left': left + 'px',
              '--bar-width': w + 'px',
              '--bar-bg': bgColor,
              '--bar-opacity': task.status === 'cancelled' ? 0.45 : 1,
              '--fill-width': fillWidth + '%',
              '--fill-color': task.status === 'closed' ? '#10b981' : priorityColor,
            }}
            onClick={() => openTask(task.id)}
            title={tooltipLines}
          >
            <div className="gbar-fill" />
            {vac && <span className="gbar-vac">🏖</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskRow;