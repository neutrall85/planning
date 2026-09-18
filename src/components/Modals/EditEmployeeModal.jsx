// src/components/Modals/EditEmployeeModal.jsx
import { useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { EmployeeFormFields } from '../EmployeeFormFields';
import { useModalForm } from '../../hooks/useModalForm';
import { hasRole } from '../../utils/permissions';

/**
 * Поля, участвующие в проверке isDirty. Явный список, а не Object.keys
 * initialValues - так требует useForm: сменить состав формы без явного
 * перечня слишком легко, и тогда служебное поле (фото, история паролей)
 * молча включится в проверку «пользователь что-то менял».
 *
 * На уровне модуля - стабильная ссылка, не пересоздаётся на каждом рендере.
 */
const FIELDS = Object.freeze([
  'last',
  'first',
  'email',
  'position',
  'phone',
  'extension',
  'tab',
  'newPass',
]);

export const EditEmployeeModal = ({ store, ur, employeeId, onClose, toast }) => {
  const db = store.data;
  const emp = db.employees.find(e => e.id === employeeId);
  if (!emp) return null;

  const initialValues = {
    last: emp.last || '',
    first: emp.first || '',
    email: emp.email || '',
    position: emp.position || 'Сотрудник',
    phone: emp.phone || '',
    extension: emp.extension || '',
    tab: emp.tab || '',
    newPass: '',
  };

  const validate = useCallback((values) => {
    const errors = {};
    if (!values.last.trim()) errors.last = 'Фамилия обязательна';
    if (!values.first.trim()) errors.first = 'Имя обязательно';
    if (!values.email.trim()) errors.email = 'E-mail обязателен';
    if (values.newPass && values.newPass.length < 8) errors.newPass = 'Пароль должен быть не менее 8 символов';
    const employees = store.data.employees;
    if (employees.some(e => e.email === values.email && e.id !== employeeId)) {
      errors.email = 'Этот email уже используется другим сотрудником';
    }
    if (values.newPass && emp.passwordHistory?.some(p => p === values.newPass)) {
      errors.newPass = 'Этот пароль уже использовался';
    }
    return errors;
  }, [emp, employeeId, store]);

  const isAdmin = hasRole(ur, 'admin');

  const saveAsync = useCallback(async (vals) => {
    const updatedEmp = {
      ...emp,
      last: vals.last.trim(),
      first: vals.first.trim(),
      email: vals.email.trim(),
      position: vals.position.trim() || 'Сотрудник',
      phone: vals.phone || '',
      extension: vals.extension || '',
      tab: vals.tab || '',
    };
    if (isAdmin && vals.newPass.trim()) {
      updatedEmp.pass = vals.newPass.trim();
      const history = emp.passwordHistory || [];
      updatedEmp.passwordHistory = [...history.slice(-4), vals.newPass.trim()];
    }
    await store.upsertEmployee(updatedEmp);
    store.addAudit('Редактирование сотрудника', `${updatedEmp.last} ${updatedEmp.first}`);
    onClose();
  }, [emp, isAdmin, store, onClose]);

  const {
    values, handleChange, errors, touched,
    handleSubmit, isSubmitting,
  } = useModalForm(initialValues, validate, saveAsync, (error) => {
    toast(error.message || 'Ошибка редактирования сотрудника', 'error');
  }, { fields: FIELDS });

  return (
    <ModalShell
      title={`Редактирование сотрудника - ${emp.last} ${emp.first}`}
      onClose={onClose}
      onSave={handleSubmit()}
      saveLabel="Сохранить"
      width={560}
      className="modal-employee"
      saveDisabled={isSubmitting}
    >
      <EmployeeFormFields
        values={values}
        onChange={handleChange}
        errors={errors}
        touched={touched}
        showPassword={isAdmin}
      />
    </ModalShell>
  );
};