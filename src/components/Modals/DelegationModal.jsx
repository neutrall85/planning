// src/components/Modals/DelegationModal.jsx
import { useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { useForm } from '../../hooks/useForm';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { ROLES } from '../../utils/constants';
import { TODAY, iso, addDays, uid } from '../../utils/date';

export const DelegationModal = ({ db, ur, onClose, onSubmit, toast }) => {
  const initialValues = {
    toId: '',
    roles: [],
    start: TODAY,
    end: iso(addDays(new Date(), 14)),
    openEnd: false,
    reason: '',
  };

  const validate = useCallback((values) => {
    const errors = {};
    if (!values.toId) errors.toId = 'Выберите получателя';
    if (!values.roles.length) errors.roles = 'Выберите хотя бы одну роль';
    if (!values.reason.trim()) errors.reason = 'Укажите обоснование';
    // Проверка дат
    if (values.start && values.end && !values.openEnd) {
      if (values.end < values.start) errors.end = 'Дата окончания не может быть раньше даты начала';
    }
    if (values.start && values.start < TODAY) {
      errors.start = 'Дата начала не может быть в прошлом';
    }
    return errors;
  }, []);

  const { values, handleChange, handleSubmit, errors, touched } = useForm(initialValues, validate);

  const saveAsync = useCallback(async (vals) => {
    const delegation = {
      id: uid(),
      fromId: ur.id,
      toId: vals.toId,
      roles: vals.roles,
      start: vals.start,
      end: vals.openEnd ? null : vals.end,
      reason: vals.reason.trim(),
      status: 'pending',
    };
    await onSubmit(delegation);
    onClose();
  }, [ur, onSubmit, onClose]);

  const { submit: save, isSubmitting } = useAsyncSubmit(saveAsync, (error) => {
    toast(error.message || 'Ошибка отправки запроса делегирования', 'error');
  });

  const employeeOptions = db.employees
    .filter(e => e.id !== ur.id && !e.fired)
    .map(e => ({ value: e.id, label: `${e.last} ${e.first}` }));

  const allowedRoles = ur.roles.filter(r => !['admin', 'director', 'executor'].includes(r));
  const roleOptions = allowedRoles.map(r => ({ value: r, label: ROLES[r].label }));

  return (
    <ModalShell
      title="Временная передача ролей"
      onClose={onClose}
      onSave={handleSubmit(save)}
      saveLabel="Отправить запрос"
      width={520}
      className="modal-delegation"
      saveDisabled={isSubmitting}
    >
      <p className="mut sm">
        Роли «Суперадминистратор» и «Генеральный директор» делегируются только через суперадминистратора. 
        Получатель должен подтвердить принятие.
      </p>
      
      <div className="project-info-fields">
        <FormField 
          label="Сотрудник-получатель *" 
          type="select" 
          options={employeeOptions} 
          value={values.toId} 
          onChange={(v) => handleChange('toId', v)} 
          error={touched.toId && errors.toId} 
        />
        <FormField 
          label="Передаваемые роли *" 
          type="select" 
          options={roleOptions} 
          value={values.roles} 
          onChange={(v) => handleChange('roles', v)} 
          error={touched.roles && errors.roles} 
          multiple 
        />
        <FormField 
          label="Дата начала *" 
          type="date" 
          value={values.start} 
          onChange={(v) => handleChange('start', v)} 
          error={touched.start && errors.start} 
        />
        <div className="field-row">
          <label className="field-label">Дата окончания</label>
          <div className="duo flex-1">
            <input 
              className="inp" 
              type="date" 
              disabled={values.openEnd} 
              value={values.end} 
              onChange={(e) => handleChange('end', e.target.value)} 
            />
            <label className="dept-pick">
              <input 
                type="checkbox" 
                checked={values.openEnd} 
                onChange={(e) => handleChange('openEnd', e.target.checked)} 
              /> 
              до отмены
            </label>
          </div>
        </div>
        <FormField 
          label="Обоснование *" 
          type="textarea" 
          rows={2} 
          value={values.reason} 
          onChange={(v) => handleChange('reason', v)} 
          error={touched.reason && errors.reason} 
        />
      </div>
    </ModalShell>
  );
};