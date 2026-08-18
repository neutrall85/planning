import { } from 'react';
import { TASK_STATUSES_ARRAY, PRIORITIES_ARRAY } from '../../../utils/constants';
import { fmtDMY, iso, parseISO } from '../../../utils/date';

/**
 * Компонент формы редактирования задачи
 * Отвечает только за отображение и валидацию полей задачи
 */
export const TaskForm = ({ 
  task, 
  projects, 
  assignees, 
  readOnly, 
  canEditFields, 
  canEditPlannedHours,
  onChange,
  empName 
}) => {
  if (!canEditFields) {
    return (
      <div style={{ padding: '20px', color: '#666' }}>
        <p>У вас нет прав на редактирование этой задачи.</p>
      </div>
    );
  }

  return (
    <div className="task-form">
      {/* Заголовок */}
      <div className="form-group">
        <label>Название задачи</label>
        <input
          type="text"
          value={task.title}
          onChange={(e) => onChange('title', e.target.value)}
          disabled={readOnly}
          placeholder="Введите название задачи"
          required
        />
      </div>

      {/* Проект */}
      <div className="form-group">
        <label>Проект</label>
        <select
          value={task.projectId || ''}
          onChange={(e) => onChange('projectId', e.target.value)}
          disabled={readOnly}
        >
          <option value="">Без проекта</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Исполнители */}
      <div className="form-group">
        <label>Исполнители</label>
        <select
          multiple
          value={task.assigneeIds || []}
          onChange={(e) => onChange('assigneeIds', Array.from(e.target.selectedOptions, opt => opt.value))}
          disabled={readOnly}
          style={{ minHeight: '100px' }}
        >
          {assignees.map(a => (
            <option key={a.id} value={a.id}>{empName(a.id)}</option>
          ))}
        </select>
        <small>Зажмите Ctrl/Cmd для выбора нескольких исполнителей</small>
      </div>

      {/* Статус */}
      <div className="form-group">
        <label>Статус</label>
        <select
          value={task.status}
          onChange={(e) => onChange('status', e.target.value)}
          disabled={readOnly}
        >
          {TASK_STATUSES_ARRAY.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Приоритет */}
      <div className="form-group">
        <label>Приоритет</label>
        <select
          value={task.priority}
          onChange={(e) => onChange('priority', e.target.value)}
          disabled={readOnly}
        >
          {PRIORITIES_ARRAY.map(p => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {/* План часов */}
      <div className="form-group">
        <label>План часов</label>
        <input
          type="number"
          min="0"
          step="0.5"
          value={task.plannedHours || 0}
          onChange={(e) => onChange('plannedHours', parseFloat(e.target.value) || 0)}
          disabled={readOnly || !canEditPlannedHours}
        />
        {canEditPlannedHours ? '' : (
          <small>Только администратор может изменять план часов</small>
        )}
      </div>

      {/* Дата начала */}
      <div className="form-group">
        <label>Дата начала</label>
        <input
          type="date"
          value={task.start ? fmtDMY(task.start) : ''}
          onChange={(e) => onChange('start', e.target.value ? iso(parseISO(e.target.value)) : null)}
          disabled={readOnly}
        />
      </div>

      {/* Дедлайн */}
      <div className="form-group">
        <label>Дедлайн</label>
        <input
          type="date"
          value={task.deadline ? fmtDMY(task.deadline) : ''}
          onChange={(e) => onChange('deadline', e.target.value ? iso(parseISO(e.target.value)) : null)}
          disabled={readOnly}
        />
      </div>

      {/* Описание */}
      <div className="form-group">
        <label>Описание</label>
        <textarea
          value={task.desc || ''}
          onChange={(e) => onChange('desc', e.target.value)}
          disabled={readOnly}
          rows={6}
          placeholder="Подробное описание задачи"
        />
      </div>
    </div>
  );
};

export default TaskForm;
