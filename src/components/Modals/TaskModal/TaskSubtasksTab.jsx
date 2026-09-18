// src/components/Modals/TaskModal/TaskSubtasksTab.jsx
import { TaskTable } from '../../TaskTable';
import { Ic, ICONS } from '../../Icons';

/** Вкладка «Подзадачи»: таблица + кнопка создания (только для уже существующей задачи). */
export function TaskSubtasksTab({
  tasks, showCreateButton, readOnly, onCreateSubtask, onRowClick,
  db, getTaskSpent, empName,
}) {
  return (
    <div className="tm-block">
      <div className="subtask-header">
        <div className="rep-panel-title">Подзадачи</div>
        {showCreateButton && (
          <button
            className="btn primary sm"
            onClick={onCreateSubtask}
            disabled={readOnly}
          >
            <Ic d={ICONS.plus} size={14} /> Создать подзадачу
          </button>
        )}
      </div>
      <TaskTable
        tasks={tasks}
        onRowClick={onRowClick}
        columns={['title', 'assignee', 'status', 'planned', 'fact', 'deadline']}
        db={db}
        getTaskSpent={getTaskSpent}
        empName={empName}
      />
    </div>
  );
}
