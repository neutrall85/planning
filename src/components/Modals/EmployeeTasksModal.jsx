// src/components/Modals/EmployeeTasksModal.jsx
import { useMemo } from 'react';
import { ModalShell } from '../ModalShell';
import { useDataHelpers } from '../../hooks';
import { isCountableTask } from '../../utils/workloadFilters';
import { fmtDMY } from '../../utils/date';

/**
 * Модалка со списком задач, назначенных сотруднику.
 *
 * Открывается через useModals.openEmployeeTasks(empId). Локального
 * состояния не имеет - состояние «какая модалка открыта» живёт в
 * useModals/ModalRenderer, как для всех остальных модалок.
 *
 * Отбор задач - через isCountableTask (utils/workloadFilters): тот же
 * предикат, что в DataStore.getWorkload. Цифры в модалке и в строке
 * дашборда всегда сходятся, потому что правило одно.
 *
 * Клик по задаче открывает полную карточку. Карточка знает про возврат
 * сюда через returnToEmployeeTasksId - при её закрытии ModalRenderer
 * снова вызовет openEmployeeTasks с тем же empId.
 */
export default function EmployeeTasksModal({ db, employeeId, openTask, onClose }) {
  const { getTaskSpent } = useDataHelpers(db);

  const employee = useMemo(
    () => db.employees.find(e => e.id === employeeId) || null,
    [db.employees, employeeId],
  );

  const tasks = useMemo(
    () => db.tasks.filter(
      t => t.assigneeId === employeeId && isCountableTask(t)
    ),
    [db.tasks, employeeId],
  );

  const projectName = (projectId) =>
    db.projects.find(p => p.id === projectId)?.name || '-';

  const handleTaskClick = (taskId) => {
    openTask(
      taskId,
      'form',
      null, null, null, null, null, null,
      employeeId, // returnToEmployeeTasksId
    );
  };

  return (
    <ModalShell
      title={`Задачи сотрудника: ${employee ? `${employee.last} ${employee.first}` : '-'}`}
      onClose={onClose}
      width={880}
      showSave={false}
    >
      {tasks.length === 0 ? (
        <div className="empty-note p-4">Нет активных задач</div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="tbl employee-tasks-table">
            <thead>
              <tr>
                <th className="text-left">Название задачи</th>
                <th className="text-left">Проект</th>
                <th className="text-center">План</th>
                <th className="text-center">Факт</th>
                <th className="text-center">Срок</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td className="text-left">
                    <button
                      type="button"
                      className="link"
                      onClick={() => handleTaskClick(t.id)}
                      title="Открыть задачу"
                    >
                      {t.title}
                    </button>
                  </td>
                  <td className="text-left">{projectName(t.projectId)}</td>
                  <td className="text-center">{t.plannedHours ?? '-'}</td>
                  <td className="text-center">{getTaskSpent(t)}</td>
                  <td className="text-center">{t.deadline ? fmtDMY(t.deadline) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalShell>
  );
}