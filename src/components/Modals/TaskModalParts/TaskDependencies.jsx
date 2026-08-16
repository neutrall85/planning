import { useState } from 'react';

/**
 * Компонент для управления зависимостями задач
 */
export const TaskDependencies = ({ 
  task, 
  allTasks, 
  readOnly, 
  canEditFields,
  onChange,
  empName 
}) => {
  const DEPENDENCY_TYPES = [
    { value: 'FS', label: 'Окончание-Начало (FS)' },
    { value: 'SS', label: 'Начало-Начало (SS)' },
    { value: 'FF', label: 'Окончание-Окончание (FF)' },
    { value: 'SF', label: 'Начало-Окончание (SF)' },
  ];

  if (!canEditFields) return null;

  const availableTasks = allTasks.filter(t => 
    t.id !== task.id && !t.archived
  );

  return (
    <div className="task-dependencies">
      <h3>Зависимости задач</h3>
      
      <div className="form-group">
        <label>Зависит от задачи</label>
        <select
          value={task.dependencyId || ''}
          onChange={(e) => onChange('dependencyId', e.target.value)}
          disabled={readOnly}
        >
          <option value="">Нет зависимости</option>
          {availableTasks.map(t => (
            <option key={t.id} value={t.id}>
              {t.title} ({empName(t.assigneeIds?.[0])})
            </option>
          ))}
        </select>
      </div>

      {task.dependencyId && (
        <div className="form-group">
          <label>Тип зависимости</label>
          <select
            value={task.dependencyType || 'FS'}
            onChange={(e) => onChange('dependencyType', e.target.value)}
            disabled={readOnly}
          >
            {DEPENDENCY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <small>
            {task.dependencyType === 'FS' && 'Эта задача начнется после окончания другой'}
            {task.dependencyType === 'SS' && 'Эта задача начнется одновременно с началом другой'}
            {task.dependencyType === 'FF' && 'Эта задача закончится одновременно с окончанием другой'}
            {task.dependencyType === 'SF' && 'Эта задача закончится после начала другой'}
          </small>
        </div>
      )}
    </div>
  );
};

export default TaskDependencies;
