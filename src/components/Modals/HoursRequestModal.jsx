// src/components/Modals/HoursRequestModal.jsx
import { useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { useForm } from '../../hooks/useForm';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { uid } from '../../utils/date';

/**
 * Поля формы, участвующие в проверке isDirty. Обязательный параметр
 * useForm - без него форма упадёт при первом рендере. Список явный,
 * потому что иначе в isDirty попали бы служебные поля.
 */
const FIELDS = Object.freeze(['newH', 'reason']);

export const HoursRequestModal = ({ db, ur, kind, targetId, onClose, onSubmit, toast }) => {
  const target = kind === 'task'
    ? db.tasks.find(t => t.id === targetId)
    : db.projects.find(p => p.id === targetId);
  const current = kind === 'task' ? target?.plannedHours : target?.budget;

  const { values, handleChange, handleSubmit, errors, touched } = useForm(
    { newH: current || 0, reason: '' },
    useCallback((values) => {
      const errors = {};
      if (!values.newH || +values.newH <= 0) errors.newH = 'Укажите положительное значение';
      if (+values.newH === current) errors.newH = 'Новое значение не должно совпадать с текущим';
      if (!values.reason.trim()) errors.reason = 'Укажите обоснование';
      if (+values.newH > 9999) errors.newH = 'Слишком большое значение (максимум 9999)';
      return errors;
    }, [current]),
    { fields: FIELDS },
  );

  const { submit: save, isSubmitting } = useAsyncSubmit(
    useCallback(async (vals) => {
      await onSubmit({
        id: uid(),
        kind,
        targetId,
        oldH: current,
        newH: +vals.newH,
        reason: vals.reason.trim(),
        reqId: ur.id,
        status: 'pending',
        ts: Date.now(),
      });
      onClose();
    }, [kind, targetId, current, ur, onSubmit, onClose]),
    (error) => {
      toast(error.message || 'Ошибка отправки запроса', 'error');
    },
  );

  return (
    <ModalShell
      title="Запрос изменения часов"
      onClose={onClose}
      onSave={handleSubmit(save)}
      saveLabel="Отправить запрос"
      width={480}
      className="modal-hours"
      saveDisabled={isSubmitting}
      showBack
    >
      <p className="mut sm">
        {kind === 'task' ? target?.title : target?.name}. Запрос будет направлен генеральному директору.
      </p>
      <div className="project-info-fields">
        <FormField
          label="Текущее значение"
          disabled
          value={(current ?? '-') + ' ч'}
        />
        <FormField
          label="Новое значение"
          required
          type="number"
          min="0.5"
          step="0.5"
          value={values.newH}
          onChange={(v) => handleChange('newH', v)}
          error={touched.newH && errors.newH}
        />
        <FormField
          label="Обоснование"
          required
          type="textarea"
          rows="3"
          value={values.reason}
          onChange={(v) => handleChange('reason', v)}
          error={touched.reason && errors.reason}
          placeholder="Почему требуется изменение…"
        />
      </div>
    </ModalShell>
  );
};