// src/components/menus/taskMenu.js
import { TASK_STATUSES, TASK_STATUS_ORDER } from '../../utils/constants';
import { canChangeTaskStatus, canCreateTask, hasRole } from '../../utils/permissions';
import { ICONS } from '../Icons';

/**
 * Состав контекстного меню задачи. Единственный источник для всех мест,
 * где задача показывается с действиями: канбан, список, календарь.
 * Правила доступа и набор пунктов меняются здесь - во всех вьюхах разом.
 *
 * Коллбэки onMove / onDelete / onCopy / onMakeTemplate - опциональные.
 * Пункт, для которого коллбэк не передан, в меню не появляется. Так
 * календарь может показывать только «Открыть / Копировать / В шаблон»,
 * а канбан - полный набор, без отдельной фабрики под каждый вью.
 *
 * Возвращает массив узлов для FloatingMenu; пустые слоты отсеиваются
 * filter(Boolean) внутри - вызывающий код не повторяет эту операцию.
 */
export function buildTaskMenu({
  task,
  user,
  db,
  openTask,
  onMove,
  onDelete,
  onCopy,
  onMakeTemplate,
}) {
  const statusChoices = onMove
    ? TASK_STATUS_ORDER.filter(
        (s) => s !== task.status && canChangeTaskStatus(user, task, s, db)
      )
    : [];
  const canDelete = !!onDelete && hasRole(user, 'admin');
  const canCopy = !!onCopy && canCreateTask(user);
  const canMakeTemplate = !!onMakeTemplate && canCreateTask(user);

  const hasStatusBlock = statusChoices.length > 0;
  const hasActionsBlock = canCopy || canMakeTemplate;
  const hasDestructiveBlock = canDelete;

  return [
    {
      id: 'open',
      label: 'Открыть',
      icon: ICONS.eye,
      onClick: () => openTask(task.id),
    },
    hasStatusBlock && { type: 'divider' },
    hasStatusBlock && { type: 'header', label: 'Перевести в статус' },
    ...statusChoices.map((s) => ({
      id: s,
      label: TASK_STATUSES[s].label,
      onClick: () => onMove(task.id, s),
    })),
    hasActionsBlock && { type: 'divider' },
    canCopy && {
      id: 'copy',
      label: 'Копировать',
      icon: ICONS.copy,
      onClick: () => onCopy(task.id),
    },
    canMakeTemplate && {
      id: 'template',
      label: 'В шаблон',
      icon: ICONS.star,
      onClick: () => onMakeTemplate(task.id),
    },
    hasDestructiveBlock && { type: 'divider' },
    canDelete && {
      id: 'del',
      label: 'Удалить задачу',
      icon: ICONS.trash,
      danger: true,
      onClick: () => onDelete(task),
    },
  ].filter(Boolean);
}