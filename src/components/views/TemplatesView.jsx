// src/components/views/TemplatesView.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, useAuth } from '../../hooks';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { canCreateTemplate } from '../../utils/permissions';
import Avatar from '../Avatar';
import { Ic, ICONS } from '../Icons';
import { fmtDT } from '../../utils/date';
import { DIALOGS, TOASTS } from '../../utils/constants';
import { TEMPLATE_KINDS } from '../../utils/templateSchemas';
import { countNestedTasks } from '../../utils/templateNesting';
import TemplateModal from '../Templates/TemplateModal';
import FloatingMenu from '../FloatingMenu';

const KIND_LABELS = {
  task: 'Задача',
  project: 'Проект',
};

const MODES = Object.freeze({
  create: 'create',
  edit: 'edit',
  view: 'view',
});

const CREATE_OPTIONS = Object.freeze([
  { kind: 'task', label: 'Шаблон задачи' },
  { kind: 'project', label: 'Шаблон проекта' },
]);

export default function TemplatesView() {
  const { store } = useStore();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [templates, setTemplates] = useState(() => store.getAllTemplates());
  const [filterKind, setFilterKind] = useState('all');
  const [modal, setModal] = useState(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const createMenuRef = useRef(null);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => setTemplates(store.getAllTemplates()));
    return unsubscribe;
  }, [store]);

  useEffect(() => {
    if (!createMenuOpen) return;
    const onDown = (event) => {
      if (createMenuRef.current && !createMenuRef.current.contains(event.target)) {
        setCreateMenuOpen(false);
      }
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setCreateMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [createMenuOpen]);

  const currentUserId = currentUser?.id || null;
  const canCreate = canCreateTemplate(currentUser);

  const visible = useMemo(() => {
    if (filterKind === 'all') return templates;
    return templates.filter(t => t.kind === filterKind);
  }, [templates, filterKind]);

  const openTemplate = useCallback((template) => {
    const isMine = template.ownerId === currentUserId;
    setModal({
      mode: isMine ? MODES.edit : MODES.view,
      template,
    });
  }, [currentUserId]);

  const openCreate = useCallback((kind) => {
    setCreateMenuOpen(false);
    setModal({ mode: MODES.create, kind });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  const deleteTemplate = useCallback(async (template) => {
    const ok = await confirm(DIALOGS.deleteTemplate(template.name));
    if (!ok) return;
    try {
      store.deleteTemplate(template.id);
      showToast(TOASTS.templateDeleted, 'success');
    } catch (error) {
      showToast(error.message || 'Не удалось удалить шаблон', 'error');
    }
  }, [store, showToast, confirm]);

  const toggleShared = useCallback((template, event) => {
    event.stopPropagation();
    if (!currentUser || template.ownerId !== currentUser.id) return;
    try {
      store.updateTemplate(template.id, { isShared: !template.isShared });
    } catch (error) {
      showToast(error.message || 'Не удалось изменить доступ к шаблону', 'error');
    }
  }, [store, currentUser, showToast]);

  const renderAccessCell = (template, isMine) => {
    const chipClass = `st-chip${template.isShared ? ' approved' : ''}`;
    const label = template.isShared ? 'общий' : 'личный';

    if (!isMine) {
      return <span className={chipClass}>{label}</span>;
    }

    return (
      <button
        type="button"
        className={`${chipClass} st-chip-toggle`}
        onClick={(e) => toggleShared(template, e)}
        title="Переключить доступ: личный ↔ общий"
      >
        {label}
      </button>
    );
  };

  const buildTemplateMenu = (template, isMine) => {
    return [
      {
        id: 'open',
        label: isMine ? 'Редактировать' : 'Просмотр',
        icon: isMine ? ICONS.edit : ICONS.eye,
        onClick: () => openTemplate(template),
      },
      isMine && { type: 'divider' },
      isMine && {
        id: 'delete',
        label: 'Удалить',
        icon: ICONS.trash,
        danger: true,
        onClick: () => deleteTemplate(template),
      },
    ].filter(Boolean);
  };

  const renderRow = (template) => {
    const owner = store.data.employees.find(e => e.id === template.ownerId);
    const isMine = template.ownerId === currentUserId;

    const projectTasksCount = template.kind === 'project' && Array.isArray(template.payload.tasks)
      ? countNestedTasks(template.payload.tasks)
      : 0;
    const taskSubtasksCount = template.kind === 'task' && Array.isArray(template.payload.subtasks)
      ? countNestedTasks(template.payload.subtasks)
      : 0;

    const templateProject = template.kind === 'task' && template.payload.projectId
      ? store.data.projects.find(p => p.id === template.payload.projectId)
      : null;

    return (
      <FloatingMenu key={template.id} items={buildTemplateMenu(template, isMine)}>
        {({ anchorProps, buttonProps }) => (
          <tr
            {...anchorProps}
            className="clickable-row"
            onClick={() => openTemplate(template)}
          >
            <td>
              <b>{template.name}</b>
              {projectTasksCount > 0 && (
                <span className="mut sm"> · {projectTasksCount} задач</span>
              )}
              {taskSubtasksCount > 0 && (
                <span className="mut sm"> · {taskSubtasksCount} подзадач</span>
              )}
              {templateProject && (
                <span className="mut sm"> · {templateProject.code}</span>
              )}
            </td>
            <td>
              <span className="st-chip">
                {KIND_LABELS[template.kind] || TEMPLATE_KINDS[template.kind]?.label || template.kind}
              </span>
            </td>
            <td>
              <div className="templates-owner">
                <Avatar employee={owner} size="xs" />
                <span>{owner ? `${owner.last} ${owner.first}` : '-'}</span>
                {isMine && <span className="mut sm">· вы</span>}
              </div>
            </td>
            <td className="mut sm">{fmtDT(template.updatedAt)}</td>
            <td>{renderAccessCell(template, isMine)}</td>
            <td className="templates-actions" onClick={(e) => e.stopPropagation()}>
              <button
                {...buttonProps}
                className="icon-btn"
                title="Действия"
                aria-label={`Действия с шаблоном ${template.name}`}
              >
                <Ic d={ICONS.more} size={15} />
              </button>
            </td>
          </tr>
        )}
      </FloatingMenu>
    );
  };

  return (
    <div className="rep">
      <div className="rep-panel p-4">
        <div className="rep-panel-title flex justify-between items-center">
          <span>Шаблоны</span>
          <div className="flex items-center gap-3">
            <div className="seg sm">
              {[
                { id: 'all', label: 'Все' },
                { id: 'task', label: 'Задачи' },
                { id: 'project', label: 'Проекты' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`seg-btn${filterKind === opt.id ? ' on' : ''}`}
                  onClick={() => setFilterKind(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {canCreate && (
              <div className="templates-create" ref={createMenuRef}>
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={() => setCreateMenuOpen(v => !v)}
                  aria-haspopup="menu"
                  aria-expanded={createMenuOpen}
                >
                  <Ic d={ICONS.plus} size={13} /> Создать шаблон
                </button>
                {createMenuOpen && (
                  <div className="templates-create-menu" role="menu">
                    {CREATE_OPTIONS.map(opt => (
                      <button
                        key={opt.kind}
                        type="button"
                        role="menuitem"
                        className="templates-create-item"
                        onClick={() => openCreate(opt.kind)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="mut sm mb-3">
          Шаблоны - это сохранённые заготовки полей задачи или проекта.
          Примените шаблон в карточке при создании новой сущности.
          Свои шаблоны можно редактировать полностью, чужие общие - только просматривать.
        </p>

        {visible.length === 0 ? (
          <div className="empty-note p-4">Шаблонов пока нет</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl templates-table">
              <thead>
                <tr>
                  <th className="templates-th-name">Название</th>
                  <th className="templates-th-kind">Тип</th>
                  <th className="templates-th-owner">Создатель</th>
                  <th className="templates-th-updated">Обновлён</th>
                  <th className="templates-th-access">Доступ</th>
                  <th className="templates-th-actions"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map(renderRow)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <TemplateModal
          mode={modal.mode}
          kind={modal.kind}
          template={modal.template}
          source={{}}
          nested={[]}
          onClose={closeModal}
          toast={showToast}
        />
      )}
    </div>
  );
}