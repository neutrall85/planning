// src/utils/taskActions.js
import { TASK_STATUSES } from './constants';
import { canChangeTaskStatus } from './permissions';
import { TODAY } from './date';

/**
 * Действия над задачей, общие для канбана, списка и календаря.
 *
 * Логика одна на весь проект: смена статуса (права, отметка о закрытии,
 * архивация, история) и удаление. Вьюхи не дублируют ни список полей,
 * ни разбор closed/cancelled - изменение правил живёт в одном файле.
 *
 * Обе функции ниже - тонкие обёртки над store. Никаких записей в аудит
 * здесь нет: журнал ведёт сервисный слой (TaskService), у которого есть
 * и сессия, и дифф полей. Дублирование записи из вьюхи давало бы две
 * строки на одно действие.
 */

/**
 * Сменить статус задачи.
 *
 * Возвращает:
 *   undefined - задачи нет, ничего не делаем;
 *   false     - прав нет, вызывающий показывает тост;
 *   true      - сохранили.
 */
export function changeTaskStatus({ task, newStatus, user, db, store }) {
  if (!task) return;
  if (!canChangeTaskStatus(user, task, newStatus, db)) return false;

  const isClosing =
    (newStatus === 'closed' || newStatus === 'cancelled') && task.status !== newStatus;

  const updated = {
    ...task,
    status: newStatus,
    closedAt: isClosing ? TODAY : task.closedAt,
    archived: isClosing ? true : task.archived,
    archivedAt: isClosing ? TODAY : task.archivedAt,
    history: [
      ...task.history,
      { ts: Date.now(), who: user.id, text: `Статус → ${TASK_STATUSES[newStatus].label}` },
    ],
  };

  store.upsertTask(updated);
  return true;
}

/**
 * Удалить задачу.
 *
 * Право на удаление проверяет фабрика меню (hasRole(user, 'admin')) -
 * сюда вызывающий код попадает уже только тогда, когда пункт был показан.
 *
 * Аудит пишет TaskService.deleteTask - здесь второй записи нет.
 */
export function deleteTask({ task, store }) {
  if (!task) return;
  store.deleteTask(task.id);
}