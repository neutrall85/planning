// src/components/menus/projectMenu.js
import { canChangeProjectStatus, canCreateProject, canEditProjectFields } from '../../utils/permissions';
import { ICONS } from '../Icons';

/**
 * Состав контекстного меню проекта. Единственный источник для Kanban-карточки
 * и списковой карточки.
 *
 * Симметрично задаче: «Копировать» и «В шаблон» производны от права
 * создать сущность (canCreateProject). «Запрос изменения часов» у
 * проекта отсутствует - в карточке проекта такой кнопки нет, и
 * добавление её в контекстное меню расширило бы поведение
 * относительно исходного UI.
 *
 * onCopy и onMakeTemplate - обязательные коллбэки; фабрика вызывает их,
 * только если права разрешают соответствующий пункт.
 */
export function buildProjectMenu({
  project,
  user,
  openProject,
  onClose,
  onCancel,
  onCopy,
  onMakeTemplate,
}) {
  const isClosed = project.status === 'closed' || project.status === 'cancelled';
  const canEdit = !isClosed && canEditProjectFields(user, project);
  const canClose = !isClosed && canChangeProjectStatus(user, project, 'closed');
  const canCancel = !isClosed && canChangeProjectStatus(user, project, 'cancelled');
  // Копирование и сохранение в шаблон - те же права, что и у кнопок
  // «Копировать» / «В шаблон» в карточке проекта.
  const canCopy = canCreateProject(user);
  const canMakeTemplate = canCreateProject(user);

  const hasActionsBlock = canCopy || canMakeTemplate;
  const hasDestructiveBlock = canClose || canCancel;

  return [
    {
      id: 'open',
      label: 'Открыть проект',
      icon: ICONS.eye,
      onClick: () => openProject(project.id),
    },
    canEdit && {
      id: 'edit',
      label: 'Редактировать',
      icon: ICONS.edit,
      onClick: () => openProject(project.id),
    },
    hasActionsBlock && { type: 'divider' },
    canCopy && {
      id: 'copy',
      label: 'Копировать',
      icon: ICONS.copy,
      onClick: () => onCopy(project.id),
    },
    canMakeTemplate && {
      id: 'template',
      label: 'В шаблон',
      icon: ICONS.star,
      onClick: () => onMakeTemplate(project.id),
    },
    hasDestructiveBlock && { type: 'divider' },
    canClose && {
      id: 'close',
      label: 'Закрыть проект',
      icon: ICONS.check,
      onClick: () => onClose(project),
    },
    canCancel && {
      id: 'cancel',
      label: 'Отменить проект',
      icon: ICONS.x,
      danger: true,
      onClick: () => onCancel(project),
    },
  ].filter(Boolean);
}