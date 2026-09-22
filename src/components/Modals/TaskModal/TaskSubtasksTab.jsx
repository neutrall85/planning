// src/components/Modals/TaskModal/TaskSubtasksTab.jsx
import { Ic, ICONS } from '../../Icons';
import { TaskTable } from '../../TaskTable';

/**
 * Вкладка «Подзадачи»: таблица + кнопка создания (только для уже
 * существующей задачи).
 *
 * Смена подзадачи с возвратом к родителю.
 *
 * В onCreateSubtask / onRowClick раньше стоял setTimeout(..., 50):
 * сначала закрывалась текущая модалка, через 50 мс открывалась новая.
 * За эти 50 мс MainLayout успевал отреагировать на промежуточное
 * состояние «modal === null, route ещё указывает на родителя» и
 * вызвать openTask повторно — это добавляло шум и участвовало в цикле
 * «Maximum update depth exceeded» при переходах между задачами.
 *
 * queueMicrotask кладёт onClose и openTask в одну очередь микрозадач.
 * React 18 батчит оба обновления в один коммит: route остаётся
 * актуальным, промежуточное состояние не выходит наружу, эффект в
 * MainLayout срабатывает один раз — на финальный набор (route, modal).
 */
export function TaskSubtasksTab({
  tasks,
  showCreateButton,
  readOnly,
  onCreateSubtask,
  onRowClick,
  db,
  getTaskSpent,
  empName,
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