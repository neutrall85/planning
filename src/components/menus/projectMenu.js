// src/components/menus/projectMenu.js
import {
  canChangeProjectStatus,
  canCreateProject,
  canManageProjectAccess,
} from '../../utils/permissions';
import {
  PROJECT_STATUS_ORDER,
  PROJECT_STATUSES,
} from '../../utils/constants';
import { ICONS } from '../Icons';

/**
 * Состав контекстного меню проекта. Единственный источник для
 * Kanban-карточки и списковой карточки.
 *
 * Симметрично задаче: «Копировать» и «В шаблон» производны от права
 * создать сущность (canCreateProject). «Запрос изменения часов» у
 * проекта отсутствует - в карточке проекта такой кнопки нет, и
 * добавление её в контекстное меню расширило бы поведение
 * относительно исходного UI.
 *
 * Отдельного пункта «Редактировать» нет: «Открыть проект» открывает
 * ту же ProjectModal, и внутри неё поля уже доступны на редактирование,
 * если у пользователя есть право (canEditProjectFields проверяется
 * внутри модалки по каждому полю). Дублировать эту же логику пунктом
 * меню - значит показывать пользователю две кнопки, ведущие в одно и
 * то же окно с одинаковым результатом.
 *
 * Блок «Перевести в статус» устроен по образцу buildTaskMenu:
 *   1. статус не показывается, если он уже установлен;
 *   2. переход предлагается, только если canChangeProjectStatus
 *      его разрешает;
 *   3. единый колбэк onMove(id, status) - тот же, что у Kanban.onDrop.
 *
 * Подтверждение для закрывающих статусов (closed / cancelled) - НЕ
 * здесь, а в колбэке onMove (ProjectsView.handleMoveProject). Причина:
 * onMove один и тот же для клика в меню и для drag-and-drop в канбане;
 * confirm должен срабатывать в обоих случаях, поэтому его место - в
 * обработчике, а не в фабрике.
 *
 * onCopy, onMakeTemplate, onOpenAccess - опциональные: фабрика вызывает
 * их, только если права разрешают соответствующий пункт. Если колбэк
 * не передан, пункт не показывается (даже когда право есть) - так
 * календарь или вью без доступа к модалке доступа может отдать
 * урезанный набор без отдельной фабрики.
 */
export function buildProjectMenu({
  project,
  user,
  openProject,
  onMove,
  onCopy,
  onMakeTemplate,
  onOpenAccess,
}) {
  const isClosed = project.status === 'closed' || project.status === 'cancelled';
  const canCopy = !!onCopy && canCreateProject(user);
  const canMakeTemplate = !!onMakeTemplate && canCreateProject(user);
  const canOpenAccess =
    !!onOpenAccess && !isClosed && canManageProjectAccess(user, project);

  // Список допустимых переходов. onMove обязателен: если его нет - блок
  // не показывается. Для закрытого/отменённого проекта блок пуст целиком
  // (isClosed отсекает): архивированный проект возвращается только через
  // раздел «Архив» отдельной кнопкой, а не сменой статуса.
  const statusChoices =
    onMove && !isClosed
      ? PROJECT_STATUS_ORDER.filter(
          (s) => s !== project.status && canChangeProjectStatus(user, project, s),
        )
      : [];

  const hasStatusBlock = statusChoices.length > 0;
  const hasActionsBlock = canCopy || canMakeTemplate || canOpenAccess;

  return [
    {
      id: 'open',
      label: 'Открыть проект',
      icon: ICONS.eye,
      onClick: () => openProject(project.id),
    },

    hasStatusBlock && { type: 'divider' },
    hasStatusBlock && { type: 'header', label: 'Перевести в статус' },
    ...statusChoices.map((s) => ({
      id: `status-${s}`,
      label: PROJECT_STATUSES[s] || s,
      onClick: () => onMove(project.id, s),
    })),

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
    canOpenAccess && {
      id: 'access',
      label: 'Доступ',
      icon: ICONS.shield,
      onClick: () => onOpenAccess(project.id),
    },
  ].filter(Boolean);
}