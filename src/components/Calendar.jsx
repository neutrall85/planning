// src/components/Calendar.jsx
import { useState, useMemo, memo } from 'react';
import { useToast } from '../context/ToastContext';
import { computeScope, canSeeAllContent, taskVisible } from '../utils/permissions';
import { isTaskActive } from '../utils/entityState';
import { changeTaskStatus, deleteTask } from '../utils/taskActions';
import { buildTaskMenu } from './menus';
import FloatingMenu from './FloatingMenu';
import Avatar from './Avatar';
import { Ic, ICONS } from './Icons';
import { ToggleSwitch } from './ToggleSwitch';
import { fmtDMY, iso, addDays } from '../utils/date';
import { useScheduleDb } from '../hooks/useDb';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const DayCell = ({ d, big, byDay, renderChip }) => {
  const dayIso = iso(d);
  const tasks = byDay[dayIso] || [];
  const todayIso = iso(new Date());
  return (
    <div className={`cal-cell${dayIso === todayIso ? ' today' : ''}`}>
      <div className="cal-daynum">{d.getDate()}</div>
      <div className="cal-chips">
        {tasks.slice(0, big ? 12 : 3).map(t => renderChip(t))}
      </div>
    </div>
  );
};

function Calendar({ ur, openTask, store, openCopyTask, openTemplateFromTask }) {
  const db = useScheduleDb();
  const { tasks, projects, employees } = db;

  const { showToast } = useToast();
  const scope = useMemo(() => computeScope(ur, db), [ur, db]);

  const [mode, setMode] = useState('month');
  const [anchor, setAnchor] = useState(new Date());
  const [showOnlyMy, setShowOnlyMy] = useState(false);

  // Единая точка правила «видит весь контент» - та же, что в TasksView
  // и ProjectsView. Раньше список ролей был продублирован здесь строкой,
  // и при изменении набора ролей приходилось править два файла.
  const canSeeAll = canSeeAllContent(ur);

  const allTasks = useMemo(() => {
    let list = tasks.filter(t =>
      isTaskActive(t) &&
      taskVisible(ur, scope, t, db) &&
      t.deadline &&
      !['closed', 'cancelled'].includes(t.status)
    );
    if (showOnlyMy) list = list.filter(t => t.assigneeId === ur.id);
    return list;
  }, [tasks, ur, scope, db, showOnlyMy]);

  const byDay = useMemo(() => {
    const m = {};
    allTasks.forEach(t => {
      (m[t.deadline] = m[t.deadline] || []).push(t);
    });
    return m;
  }, [allTasks]);

  const shift = (dir) => {
    if (mode === 'month') {
      setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1));
    } else if (mode === 'week') {
      setAnchor(addDays(anchor, dir * 7));
    } else {
      setAnchor(addDays(anchor, dir));
    }
  };

  const title =
    mode === 'month'
      ? `${MONTH_NAMES[anchor.getMonth()]} ${anchor.getFullYear()}`
      : mode === 'week'
        ? `Неделя ${fmtDMY(iso(addDays(anchor, -((anchor.getDay() + 6) % 7))))} - ${fmtDMY(iso(addDays(anchor, 6 - (anchor.getDay() + 6) % 7)))}`
        : fmtDMY(iso(anchor));

  const handleMoveTask = (taskId, newStatus) => {
    if (changeTaskStatus({
      task: tasks.find(t => t.id === taskId),
      newStatus, user: ur, db, store,
    }) === false) {
      showToast('У вас нет прав на изменение статуса этой задачи.', 'error');
    }
  };

  const handleDeleteTask = (task) => {
    deleteTask({ task, store });
    showToast(`Задача «${task.title}» удалена`, 'success');
  };

  const renderTaskChip = (task) => {
    const p = projects.find(x => x.id === task.projectId);
    const assignee = task.assigneeId ? employees.find(e => e.id === task.assigneeId) : null;
    const menuItems = buildTaskMenu({
      task, user: ur, db, openTask,
      onMove: handleMoveTask,
      onDelete: handleDeleteTask,
      onCopy: openCopyTask,
      onMakeTemplate: openTemplateFromTask,
    });

    return (
      <FloatingMenu key={task.id} items={menuItems}>
        {({ anchorProps }) => (
          <div
            {...anchorProps}
            className="cal-chip"
            style={{ borderColor: p?.color }}
            onClick={() => openTask(task.id)}
            title={`${task.title} (${p?.code || 'без проекта'})`}
          >
            <div className="cal-task-title">
              <span className="pdot" style={{ background: p?.color }} />
              <span>{task.title}</span>
            </div>
            <div className="cal-executors">
              {assignee && <Avatar employee={assignee} size="xs" />}
            </div>
          </div>
        )}
      </FloatingMenu>
    );
  };

  let body = null;
  if (mode === 'month') {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const cells = [];
    for (let i = 0; i < 42; i++) cells.push(addDays(first, i - offset));
    body = (
      <>
        <div className="cal-grid-head">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(w => (
            <div key={w} className="cal-wd">{w}</div>
          ))}
        </div>
        <div className="cal-grid">
          {cells.map(d => (
            <div key={iso(d)} className={d.getMonth() === anchor.getMonth() ? '' : 'outwrap'}>
              <DayCell d={d} big={false} byDay={byDay} renderChip={renderTaskChip} />
            </div>
          ))}
        </div>
      </>
    );
  } else if (mode === 'week') {
    const mon = addDays(anchor, -((anchor.getDay() + 6) % 7));
    body = (
      <div className="cal-week">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <DayCell key={i} d={addDays(mon, i)} big byDay={byDay} renderChip={renderTaskChip} />
        ))}
      </div>
    );
  } else {
    body = (
      <div className="cal-week one">
        <DayCell d={anchor} big byDay={byDay} renderChip={renderTaskChip} />
      </div>
    );
  }

  return (
    <div className="cal-panel">
      <div className="cal-head">
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => shift(-1)}>
            <Ic d={ICONS.left} size={16} />
          </button>
          <div className="cal-title">{title}</div>
          <button className="icon-btn" onClick={() => shift(1)}>
            <Ic d={ICONS.right} size={16} />
          </button>
        </div>
        <div className="cal-right">
          <button className="btn ghost sm" onClick={() => setAnchor(new Date())}>Сегодня</button>
          <div className="seg">
            {['day', 'week', 'month'].map(m => (
              <button
                key={m}
                className={`seg-btn${mode === m ? ' on' : ''}`}
                onClick={() => setMode(m)}
              >
                {['День', 'Неделя', 'Месяц'][['day', 'week', 'month'].indexOf(m)]}
              </button>
            ))}
          </div>
          {canSeeAll && (
            <ToggleSwitch
              checked={showOnlyMy}
              onChange={setShowOnlyMy}
              label="Мои задачи"
            />
          )}
        </div>
      </div>
      <div className="cal-note">Только задачи со сроком выполнения.</div>
      {body}
    </div>
  );
}

export default memo(Calendar);