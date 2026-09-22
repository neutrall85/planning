// src/components/Modals/TaskModal/TaskFormTab.jsx
import { FormField } from '../../FormField';
import { TemplateSelect } from '../../Templates';
import { Ic, ICONS } from '../../Icons';

/**
 * Вкладка «Данные» — поля карточки задачи.
 *
 * Чистый presentational-компонент: вся логика (валидация, опции
 * селектов, применение шаблона) приходит снаружи, здесь только
 * разметка и обработчики onChange, ведущие обратно в форму.
 *
 * Вёрстка пар с кнопками-действиями.
 *
 * Раньше кнопка была обёрнута вместе с полем в .field-with-action
 * (flex-column), и правое поле визуально «уезжало» вверх: пара
 * полей в .fields-row выравнивалась по центру относительно
 * двухстрочной колонки. Теперь:
 *
 *     .fields-with-action        ← группа
 *       .fields-row              ← пара полей, одна горизонталь
 *       .field-action-row        ← строка под парой, кнопка справа
 *
 * Кнопка садится ровно под правым полем пары: .field-action-row — та
 * же сетка 1fr 1fr с тем же gap, что у .fields-row, а сама кнопка
 * смещена во вторую колонку. Ничего не съезжает, поля читаются
 * единой строкой.
 *
 * lockedField — имя поля, зафиксированного зависимостью ('start' или
 * 'deadline'), либо null. Поле с этим именем блокируется.
 */
export function TaskFormTab({
  form,
  access,
  options,
  template,
  summary,
  onRequestHours,
  onRequestDeadline,
  lockedField,
}) {
  const { values, handleChange, updateValues, touched, errors } = form;
  const { canEditFields, isProjectLocked, isAdminProject } = access;
  const {
    projectOptions,
    assigneeOptionsList,
    priorityOptions,
    statusOptions,
    dependencyOptions,
    dependencyTypeOptions,
  } = options;
  const { isNew, isCopy, appliedTemplateName, onApply } = template;

  const startLocked    = lockedField === 'start';
  const deadlineLocked = lockedField === 'deadline';

  return (
    <div className="project-info-fields">
      {isNew && !isCopy && (
        <TemplateSelect kind="task" onApply={onApply} />
      )}

      {isNew && appliedTemplateName && (
        <div className="info-box">
          Применён шаблон: <b>{appliedTemplateName}</b>
        </div>
      )}

      <FormField
        label="Название"
        required
        value={values.title}
        onChange={(v) => handleChange('title', v)}
        error={touched.title && errors.title}
        disabled={!canEditFields}
        inline
      />

      <div className="field-row">
        <label className="field-label" />
        <div className="flex-1 flex gap-4">
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={summary.checked}
              onChange={(e) => handleChange('isSummary', e.target.checked)}
              disabled={summary.disabled}
            />
            Суммарная задача
          </label>
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={values.isHourly}
              onChange={(e) => updateValues({ isHourly: e.target.checked })}
              disabled={!canEditFields}
            />
            Часовая задача
          </label>
        </div>
      </div>

      <FormField
        label="Описание"
        type="textarea"
        rows={2}
        value={values.desc}
        onChange={(v) => handleChange('desc', v)}
        disabled={!canEditFields}
        inline
      />

      <FormField
        label="Проект"
        required
        type="select"
        options={projectOptions}
        value={values.projectId ?? ''}
        onChange={(v) => handleChange('projectId', v)}
        error={touched.projectId && errors.projectId}
        disabled={!canEditFields || isProjectLocked}
        inline
      />

      <div className="fields-with-action">
        <div className="fields-row">
          <FormField
            label="Исполнитель"
            required
            type="select"
            options={assigneeOptionsList}
            value={values.assigneeId ?? ''}
            onChange={(v) => handleChange('assigneeId', v)}
            error={touched.assigneeId && errors.assigneeId}
            disabled={!canEditFields}
            inline
          />
          <FormField
            label="Плановые часы"
            required={!isAdminProject}
            type="number"
            min="0.5"
            step="0.5"
            value={values.plannedHours ?? ''}
            onChange={(v) => handleChange('plannedHours', v)}
            error={touched.plannedHours && errors.plannedHours}
            disabled={!canEditFields || values.isHourly}
            inline
          />
        </div>
        {onRequestHours && (
          <div className="field-action-row">
            <button
              type="button"
              className="btn request-hours field-action"
              onClick={onRequestHours}
            >
              <Ic d={ICONS.clock} size={14} /> Запросить изменение часов
            </button>
          </div>
        )}
      </div>

      <div className="fields-row">
        <FormField
          label="Приоритет"
          required
          type="select"
          options={priorityOptions}
          value={values.priority ?? ''}
          onChange={(v) => handleChange('priority', v)}
          error={touched.priority && errors.priority}
          disabled={!canEditFields}
          inline
        />
        <FormField
          label="Статус"
          required
          type="select"
          options={statusOptions}
          value={values.status ?? ''}
          onChange={(v) => handleChange('status', v)}
          error={touched.status && errors.status}
          disabled={!canEditFields}
          inline
        />
      </div>

      <div className="fields-with-action">
        <div className="fields-row">
          <FormField
            label="Начало"
            required
            type="date"
            value={values.start}
            onChange={(v) => updateValues({ start: v })}
            error={touched.start && errors.start}
            disabled={!canEditFields || startLocked}
            inline
          />
          <FormField
            label="Срок исполнения"
            required={!isAdminProject}
            type="date"
            value={values.deadline}
            onChange={(v) => handleChange('deadline', v)}
            error={touched.deadline && errors.deadline}
            disabled={!canEditFields || values.isHourly || deadlineLocked}
            inline
          />
        </div>
        {onRequestDeadline && (
          <div className="field-action-row">
            <button
              type="button"
              className="btn request-hours field-action"
              onClick={onRequestDeadline}
            >
              <Ic d={ICONS.cal} size={14} /> Запросить изменение срока
            </button>
          </div>
        )}
      </div>

      {values.isHourly && (
        <div className="fields-row">
          <FormField
            label="Время начала"
            required
            type="time"
            value={values.startTime}
            onChange={(v) => updateValues({ startTime: v })}
            error={touched.startTime && errors.startTime}
            disabled={!canEditFields}
            inline
          />
          <FormField
            label="Время окончания"
            required
            type="time"
            value={values.endTime}
            onChange={(v) => updateValues({ endTime: v })}
            error={touched.endTime && errors.endTime}
            disabled={!canEditFields}
            inline
          />
        </div>
      )}

      <FormField
        label="Зависит от задачи"
        type="select"
        options={dependencyOptions}
        value={values.dependencyId ?? ''}
        onChange={(v) => handleChange('dependencyId', v)}
        disabled={!canEditFields}
        inline
      />

      <FormField
        label="Тип зависимости"
        type="select"
        options={dependencyTypeOptions}
        value={values.dependencyType ?? ''}
        onChange={(v) => handleChange('dependencyType', v)}
        disabled={!canEditFields || !values.dependencyId}
        inline
      />
    </div>
  );
}