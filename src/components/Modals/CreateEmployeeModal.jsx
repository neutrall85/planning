// src/components/Modals/CreateEmployeeModal.jsx
import { useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { EmployeeFormFields } from '../EmployeeFormFields';
import { useModalForm } from '../../hooks/useModalForm';
import { uid } from '../../utils/date';
import { ROLES } from '../../utils/constants';
import { FormField } from '../FormField';

const FIELDS = Object.freeze([
  'last',
  'first',
  'email',
  'pass',
  'position',
  'phone',
  'extension',
  'tab',
  'roles',
]);

export const CreateEmployeeModal = ({ store, ur, onClose, toast }) => {
  const initialValues = {
    last: '',
    first: '',
    email: '',
    pass: '',
    position: 'Сотрудник',
    phone: '',
    extension: '',
    tab: String(1000 + Math.floor(Math.random() * 8999)),
    roles: ['executor'],
  };

  const validate = useCallback((values) => {
    const errors = {};
    if (!values.last.trim()) errors.last = 'Фамилия обязательна';
    if (!values.first.trim()) errors.first = 'Имя обязательно';
    if (!values.email.trim()) errors.email = 'E-mail обязателен';
    if (!values.pass.trim()) errors.pass = 'Пароль обязателен';
    if (values.pass.length < 8) errors.pass = 'Пароль должен быть не менее 8 символов';
    const employees = store.data.employees;
    if (employees.some(e => e.email === values.email)) {
      errors.email = 'Сотрудник с таким email уже существует';
    }
    return errors;
  }, [store]);

  const saveAsync = useCallback(async (vals) => {
    const newEmp = {
      id: 'e_' + uid(),
      last: vals.last.trim(),
      first: vals.first.trim(),
      email: vals.email.trim(),
      pass: vals.pass,
      position: vals.position.trim() || 'Сотрудник',
      departments: [],
      roles: vals.roles,
      kbIds: [],
      headDeptIds: [],
      phone: vals.phone || '',
      extension: vals.extension || '',
      tab: vals.tab || String(1000 + Math.floor(Math.random() * 8999)),
      notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
      failed: 0,
      lockUntil: 0,
      fired: false,
      photo: null,
      passwordHistory: [],
    };
    await store.upsertEmployee(newEmp);
    store.addAudit('Создание сотрудника', `${newEmp.last} ${newEmp.first}`);
    store.addNotification(ur.id, `Создан сотрудник ${newEmp.last} ${newEmp.first}`, { targetType: 'employee', targetId: newEmp.id });
    onClose();
  }, [store, ur, onClose]);

  const {
    values, handleChange, errors, touched,
    handleSubmit, isSubmitting,
  } = useModalForm(initialValues, validate, saveAsync, (error) => {
    toast(error.message || 'Ошибка создания сотрудника', 'error');
  }, { fields: FIELDS });

  const roleOptions = Object.entries(ROLES).map(([k, v]) => ({ value: k, label: v.label }));

  return (
    <ModalShell
      title="Добавить сотрудника"
      onClose={onClose}
      onSave={handleSubmit()}
      saveLabel="Создать"
      width={560}
      className="modal-employee"
      saveDisabled={isSubmitting}
    >
      <EmployeeFormFields
        values={values}
        onChange={handleChange}
        errors={errors}
        touched={touched}
        passwordRequired
      />
      <div className="mt-3">
        <FormField
          label="Роли (по умолчанию исполнитель)"
          type="select"
          options={roleOptions}
          value={values.roles}
          onChange={(v) => handleChange('roles', v)}
          multiple
        />
      </div>
    </ModalShell>
  );
};