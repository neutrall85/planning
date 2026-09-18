// src/components/Modals/VacationModal.jsx
import { useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { useForm } from '../../hooks/useForm';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { useDataHelpers } from '../../hooks';
import { VACATION_TYPES, TASK_STATUSES } from '../../utils/constants';
import { TODAY, iso, addDays, uid, fmtDMY } from '../../utils/date';
import { canManageAllVacations } from '../../utils/permissions';
import { getPrimaryDeptName } from '../../utils/helpers';

const FIELDS = Object.freeze([
  'empId',
  'start',
  'end',
  'type',
  'comment',
  'status',
  'delegation',
]);

export const VacationModal = ({ db, ur, vacationId, forEmpId, onClose, onSave, toast }) => {
  const { empName } = useDataHelpers(db);
  const existing = vacationId ? db.vacations.find(v => v.id === vacationId) : null;
  const isNew = !existing;
  const canPick = canManageAllVacations(ur);

  const initialValues = existing ? { ...existing, delegation: { ...existing.delegation } } : {
    id: 'v_' + uid(),
    empId: forEmpId || ur.id,
    start: TODAY,
    end: iso(addDays(new Date(), 7)),
    type: 'annual',
    comment: '',
    status: canPick && forEmpId ? 'approved' : 'pending',
    delegation: { enabled: false, subId: '', statuses: [], state: null },
  };

  const validate = useCallback((values) => {
    const errors = {};
    if (!values.start) errors.start = 'Дата начала обязательна';
    if (!values.end) errors.end = 'Дата окончания обязательна';
    if (values.end && values.start && values.end < values.start) {
      errors.end = 'Дата окончания должна быть позже начала';
    }
    if (values.delegation.enabled && !values.delegation.subId) {
      errors['delegation.subId'] = 'Выберите замещающего сотрудника';
    }
    if (values.empId) {
      const overlapping = db.vacations.some(v =>
        v.empId === values.empId &&
        v.id !== values.id &&
        v.status === 'approved' &&
        v.start <= values.end &&
        v.end >= values.start
      );
      if (overlapping) {
        errors.start = 'У сотрудника уже есть утверждённый отпуск в этот период';
      }
    }
    return errors;
  }, [db, existing]);

  const { values, handleChange, handleSubmit, errors, touched } = useForm(
    initialValues,
    validate,
    { fields: FIELDS },
  );

  const saveAsync = useCallback(async (vals) => {
    await onSave(vals, isNew);
    onClose();
  }, [onSave, isNew, onClose]);

  const { submit: save, isSubmitting } = useAsyncSubmit(saveAsync, (error) => {
    toast(error.message || 'Ошибка сохранения отпуска', 'error');
  });

  const employeeOptions = db.employees.map(e => ({
    value: e.id,
    label: `${empName(e.id)} - ${getPrimaryDeptName(e, db)}`,
  }));
  const substituteOptions = db.employees.filter(e => e.id !== values.empId).map(e => ({
    value: e.id,
    label: `${empName(e.id)} - ${getPrimaryDeptName(e, db)}`,
  }));
  const statusOptions = [
    { value: 'pending', label: 'На утверждении' },
    { value: 'approved', label: 'Утверждён' },
    { value: 'rejected', label: 'Отклонён' },
  ];
  const typeOptions = Object.entries(VACATION_TYPES).map(([k, v]) => ({ value: k, label: v }));
  const statusList = ['new', 'inwork', 'review'].map(s => ({ value: s, label: TASK_STATUSES[s].label }));

  return (
    <ModalShell
      title={existing ? 'Редактирование отпуска' : 'Новый отпуск'}
      onClose={onClose}
      onSave={handleSubmit(save)}
      saveLabel="Сохранить"
      width={560}
      className="modal-vacation"
      saveDisabled={isSubmitting}
    >
      <div className="project-info-fields">
        {canPick && (
          <FormField
            label="Сотрудник"
            required
            type="select"
            options={employeeOptions}
            value={values.empId}
            onChange={(v) => handleChange('empId', v)}
            disabled={!!existing}
          />
        )}
        <FormField
          label="Дата начала"
          required
          type="date"
          value={values.start}
          onChange={(v) => handleChange('start', v)}
          error={touched.start && errors.start}
        />
        <FormField
          label="Дата окончания"
          required
          type="date"
          value={values.end}
          onChange={(v) => handleChange('end', v)}
          error={touched.end && errors.end}
        />
        <FormField
          label="Тип отпуска"
          required
          type="select"
          options={typeOptions}
          value={values.type}
          onChange={(v) => handleChange('type', v)}
        />
        <FormField
          label="Комментарий"
          value={values.comment}
          onChange={(v) => handleChange('comment', v)}
        />
        {canPick && (
          <FormField
            label="Статус"
            type="select"
            options={statusOptions}
            value={values.status}
            onChange={(v) => handleChange('status', v)}
          />
        )}
      </div>

      <div className="tm-block">
        <div className="field-row">
          <label className="field-label">Делегирование</label>
          <div className="flex-1">
            <label className="roles-item" style={{ border: 'none', padding: 0 }}>
              <input
                type="checkbox"
                checked={values.delegation.enabled}
                onChange={(e) => handleChange('delegation.enabled', e.target.checked)}
              />
              <b>Делегировать задачи на время отпуска</b>
            </label>
          </div>
        </div>
        {values.delegation.enabled && (
          <>
            <FormField
              label="Замещающий сотрудник"
              required
              type="select"
              options={substituteOptions}
              value={values.delegation.subId}
              onChange={(v) => handleChange('delegation.subId', v)}
              error={touched['delegation.subId'] && errors['delegation.subId']}
            />
            <div className="field-row">
              <label className="field-label">Какие задачи</label>
              <div className="sub-picks">
                {statusList.map(s => (
                  <label key={s.value} className="dept-pick">
                    <input
                      type="checkbox"
                      checked={values.delegation.statuses.includes(s.value)}
                      onChange={(e) => {
                        const newStatuses = e.target.checked
                          ? [...values.delegation.statuses, s.value]
                          : values.delegation.statuses.filter(x => x !== s.value);
                        handleChange('delegation.statuses', newStatuses);
                      }}
                    />
                    {s.label}
                  </label>
                ))}
                <span className="mut sm">пусто = все активные задачи</span>
              </div>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};