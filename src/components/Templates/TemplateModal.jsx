import { useCallback, useMemo, useState } from 'react';
import { ModalShell } from '../ModalShell';
import { Tabs } from '../Tabs';
import { FormField } from '../FormField';
import { useForm } from '../../hooks/useForm';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { useStore } from '../../hooks/useStore';
import {
  TEMPLATE_KINDS,
  TEMPLATE_FIELDS_META,
  TEMPLATE_KIND_LABELS,
} from '../../utils/templateSchemas';
import { countNestedTasks } from '../../utils/templateNesting';
import { useNestedModalEscape } from './useNestedModalEscape';
import TaskDraftModal from './TaskDraftModal';
import DraftListItem from './DraftListItem';

const MAX_NAME_LENGTH = 80;

/**
 * Поля формы шаблона, участвующие в проверке isDirty. Обязательный
 * параметр useForm - без него форма падает на первом рендере. Список
 * явный: только два поля формы, поля payload редактируются отдельно
 * (setPayloadField) и не должны открывать кнопку «Сохранить» сами по
 * себе - иначе достаточно кликнуть в поле «Название», ничего не меняя,
 * и Save станет активным.
 */
const FIELDS = Object.freeze(['name', 'isShared']);

const MODES = Object.freeze({
  create: 'create',
  edit: 'edit',
  view: 'view',
});

const createEmptyNestedNode = (singular) => ({
  title: `Новая ${singular}`,
  priority: 'mid',
  plannedHours: 8,
});

export default function TemplateModal({
  mode = MODES.create,
  kind: propKind,
  source,
  nested = [],
  template = null,
  onClose,
  toast,
}) {
  const { store } = useStore();
  useNestedModalEscape(onClose);

  const isCreate = mode === MODES.create;
  const isEdit = mode === MODES.edit;
  const isView = mode === MODES.view;
  const readOnly = isView;

  const effectiveKind = template?.kind || propKind;
  const kindMeta = TEMPLATE_KINDS[effectiveKind];
  const fieldsMeta = TEMPLATE_FIELDS_META[effectiveKind] || {};
  const nestedKey = kindMeta?.nestedKey;
  const nestedLabel = kindMeta?.nestedLabel || 'вложенные элементы';
  const nestedSingular = kindMeta?.nestedSingular || 'элемент';
  const kindLabel = TEMPLATE_KIND_LABELS[effectiveKind] || 'сущности';

  const initialPayload = useMemo(() => {
    if (isCreate) {
      const base = { ...(source || {}) };
      if (nested.length && nestedKey) base[nestedKey] = nested;
      return base;
    }
    return { ...(template?.payload || {}) };
  }, []);

  const [payload, setPayload] = useState(initialPayload);
  const [includeNested, setIncludeNested] = useState(
    () => Array.isArray(initialPayload[nestedKey]) && initialPayload[nestedKey].length > 0
  );
  const [activeTab, setActiveTab] = useState('info');
  const [editingDraftIndex, setEditingDraftIndex] = useState(null);

  const nestedItems = useMemo(
    () => (Array.isArray(payload[nestedKey]) ? payload[nestedKey] : []),
    [payload, nestedKey]
  );

  const initialValues = useMemo(() => ({
    name: template?.name || '',
    isShared: template?.isShared || false,
  }), [template]);

  const validate = useCallback((vals) => {
    const errors = {};
    const name = String(vals.name || '').trim();
    if (!name) errors.name = 'Укажите название';
    else if (name.length > MAX_NAME_LENGTH) errors.name = `Не более ${MAX_NAME_LENGTH} символов`;
    return errors;
  }, []);

  const setPayloadField = useCallback((field, value) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setNested = useCallback((next) => {
    setPayload((prev) => {
      const copy = { ...prev };
      if (next.length) copy[nestedKey] = next;
      else delete copy[nestedKey];
      return copy;
    });
  }, [nestedKey]);

  const updateDraftAt = useCallback((idx, next) => {
    setNested(nestedItems.map((n, i) => (i === idx ? next : n)));
  }, [nestedItems, setNested]);

  const deleteDraftAt = useCallback((idx) => {
    setNested(nestedItems.filter((_, i) => i !== idx));
    setEditingDraftIndex(null);
  }, [nestedItems, setNested]);

  const saveAsync = useCallback(async (vals) => {
    if (isEdit) {
      store.updateTemplate(template.id, {
        name: vals.name,
        isShared: vals.isShared,
        payload,
      });
    } else if (isCreate) {
      const payloadSource = { ...payload };
      if (nestedKey && !includeNested) delete payloadSource[nestedKey];
      store.saveTemplate({
        kind: effectiveKind,
        name: vals.name,
        isShared: vals.isShared,
        source: payloadSource,
      });
    }
    onClose();
  }, [isEdit, isCreate, template, payload, includeNested, nestedKey, effectiveKind, store, onClose]);

  const { values, handleChange, handleSubmit, errors, touched } = useForm(
    initialValues,
    validate,
    { fields: FIELDS },
  );

  const { submit, isSubmitting } = useAsyncSubmit(saveAsync, (error) => {
    toast(error.message || 'Не удалось сохранить шаблон', 'error');
  });

  const title = isView
    ? `Шаблон: ${template?.name || ''}`
    : isEdit
      ? `Редактирование шаблона ${kindLabel}`
      : `Сохранить как шаблон ${kindLabel}`;

  const saveLabel = isEdit ? 'Сохранить' : 'Создать';

  const footer = isView
    ? (
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Закрыть</button>
      </div>
    )
    : null;

  const nestedCount = countNestedTasks(nestedItems);

  const addNestedNode = () => {
    setNested([...nestedItems, createEmptyNestedNode(nestedSingular)]);
    if (isCreate && !includeNested) setIncludeNested(true);
  };

  const tabs = [
    { id: 'info', label: 'Информация' },
    ...(nestedKey
      ? [{ id: 'nested', label: `${nestedLabel} (${nestedItems.length})` }]
      : []),
  ];

  const renderProjectField = () => {
    if (effectiveKind !== 'task') return null;

    const projectId = payload.projectId ?? '';
    const project = projectId
      ? store.data.projects.find(p => p.id === projectId)
      : null;

    if (readOnly) {
      const display = project
        ? `${project.code} - ${project.name}`
        : (projectId ? 'Проект недоступен' : '- не указан -');
      return (
        <div className="field-row">
          <label className="field-label">Проект</label>
          <div className="flex-1">
            <div className="inp" aria-disabled="true">{display}</div>
          </div>
        </div>
      );
    }

    const projectOptions = [
      { value: '', label: '- Не выбран -' },
      ...store.data.projects
        .filter(p => p.status === 'active' && !p.archived)
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(p => ({ value: p.id, label: `${p.code} - ${p.name}` })),
    ];

    return (
      <FormField
        label="Проект"
        type="select"
        options={projectOptions}
        value={projectId}
        onChange={(v) => setPayloadField('projectId', v)}
        inline
      />
    );
  };

  const renderInfoTab = () => (
    <>
      {isView && (
        <div className="info-box">
          Это общий шаблон. Менять его содержимое может только владелец.
        </div>
      )}

      <FormField
        label="Название шаблона"
        required
        value={values.name}
        onChange={(v) => handleChange('name', v)}
        error={touched.name && errors.name}
        disabled={readOnly}
        inline
      />

      <div className="field-row">
        <label className="field-label">Общий шаблон</label>
        <label className="dept-pick">
          <input
            type="checkbox"
            checked={values.isShared}
            disabled={readOnly}
            onChange={(e) => handleChange('isShared', e.target.checked)}
          />
          <span>
            {values.isShared
              ? 'Доступен всем сотрудникам'
              : 'Личный - видите только вы'}
          </span>
        </label>
      </div>

      {Object.keys(fieldsMeta).length > 0 && (
        <div className="mt-3">
          <div className="rep-panel-title">Параметры</div>
          {renderProjectField()}
          {Object.entries(fieldsMeta).map(([field, meta]) => (
            <FormField
              key={field}
              label={meta.label}
              required={meta.required}
              type={meta.type || 'text'}
              options={meta.options}
              rows={meta.type === 'textarea' ? 2 : undefined}
              value={payload[field] ?? ''}
              onChange={(v) => setPayloadField(field, v)}
              disabled={readOnly}
              inline
            />
          ))}
        </div>
      )}
    </>
  );

  const renderNestedTab = () => (
    <>
      <div className="template-tree-header">
        <div className="template-tree-title">{nestedLabel} ({nestedCount})</div>
        {!readOnly && (
          <button type="button" className="btn ghost sm" onClick={addNestedNode}>
            + {nestedSingular}
          </button>
        )}
      </div>

      {isCreate && nestedItems.length > 0 && (
        <div className="field-row">
          <label className="field-label">Сохранение</label>
          <label className="dept-pick">
            <input
              type="checkbox"
              checked={includeNested}
              onChange={(e) => setIncludeNested(e.target.checked)}
            />
            <span>Включить в шаблон при сохранении</span>
          </label>
        </div>
      )}

      {nestedItems.length === 0 ? (
        <div className="mut sm">Вложенных элементов нет</div>
      ) : (
        <div className="template-draft-list">
          {nestedItems.map((node, idx) => (
            <DraftListItem
              key={idx}
              node={node}
              onClick={() => setEditingDraftIndex(idx)}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      <ModalShell
        title={title}
        onClose={onClose}
        onSave={isView ? undefined : handleSubmit(submit)}
        saveLabel={saveLabel}
        showSave={!isView}
        saveDisabled={isSubmitting}
        width={620}
        footer={footer}
      >
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
        <div className="project-info-fields">
          {activeTab === 'info' && renderInfoTab()}
          {activeTab === 'nested' && nestedKey && renderNestedTab()}
        </div>
      </ModalShell>

      {editingDraftIndex !== null && nestedItems[editingDraftIndex] && (
        <TaskDraftModal
          node={nestedItems[editingDraftIndex]}
          readOnly={readOnly}
          childSingular={nestedSingular}
          onChange={(next) => updateDraftAt(editingDraftIndex, next)}
          onDelete={readOnly ? null : () => deleteDraftAt(editingDraftIndex)}
          onClose={() => setEditingDraftIndex(null)}
        />
      )}
    </>
  );
}