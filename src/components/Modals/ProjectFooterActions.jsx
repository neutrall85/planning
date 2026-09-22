// src/components/Modals/ProjectFooterActions.jsx
import { Ic, ICONS } from '../Icons';
import { TemplateActions } from '../Templates';
import { collectTaskPayloads } from '../../utils/templateNesting';
import { hasRole } from '../../utils/permissions';

/**
 * Левый блок футера карточки проекта: удаление, копирование,
 * «В шаблон», управление доступом.
 *
 * Правая часть (spacer + «Отмена» + «Создать/Сохранить») собирается в
 * ProjectModal - здесь её нет, чтобы разметка основной панели жила
 * ровно в одном месте, а кнопки - в одном месте.
 *
 * Показывает только действия; сами предикаты (hasRole, canXxx)
 * считаются в ProjectModal и приходят готовыми булевыми флагами.
 */
export function ProjectFooterActions({
  readOnly,
  existing,
  ur,
  canCreateFromProject,
  canManageAccess,
  values,
  db,
  toast,
  onDelete,
  onCopy,
  onOpenAccess,
}) {
  return (
    <>
      {!readOnly && existing && hasRole(ur, 'admin') && (
        <button className="btn danger" onClick={onDelete}>
          <Ic d={ICONS.trash} size={14} /> Удалить проект
        </button>
      )}

      {existing && onCopy && canCreateFromProject && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => onCopy(existing.id)}
          title="Создать новый проект на основе этого"
        >
          <Ic d={ICONS.copy} size={13} /> Копировать
        </button>
      )}

      {canCreateFromProject && (
        <TemplateActions
          kind="project"
          source={values}
          nested={existing ? collectTaskPayloads(
            db.tasks.filter(t => t.projectId === existing.id && !t.archived)
          ) : []}
          toast={toast}
          disabled={!values.name?.trim()}
        />
      )}

      {canManageAccess && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={onOpenAccess}
          title="Управление доступом к проекту"
        >
          <Ic d={ICONS.shield} size={13} /> Доступ
        </button>
      )}
    </>
  );
}