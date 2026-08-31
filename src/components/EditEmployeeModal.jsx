import React, { useState } from 'react';
import { Modal } from './Modal';
import { hasRole } from '../utils/permissions';

export default function EditEmployeeModal({ db, setDb, employeeId, onClose, toast, audit, ur }) {
  const emp = db.employees.find(e => e.id === employeeId);
  if (!emp) return null;

  const [form, setForm] = useState({
    last: emp.last || '',
    first: emp.first || '',
    email: emp.email || '',
    position: emp.position || 'Сотрудник',
    phone: emp.phone || '',
    extension: emp.extension || '',
    tab: emp.tab || '',
  });
  const [newPass, setNewPass] = useState('');

  const isAdmin = hasRole(ur, 'admin');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    if (!form.last.trim() || !form.first.trim() || !form.email.trim()) {
      toast('Фамилия, имя и email обязательны', 'err');
      return;
    }
    const updatedEmp = {
      ...emp,
      last: form.last.trim(),
      first: form.first.trim(),
      email: form.email.trim(),
      position: form.position.trim() || 'Сотрудник',
      phone: form.phone || '',
      extension: form.extension || '',
      tab: form.tab || '',
    };
    if (isAdmin && newPass.trim()) {
      if (newPass.length < 8) {
        toast('Пароль должен быть не менее 8 символов', 'err');
        return;
      }
      updatedEmp.pass = newPass.trim();
      const history = emp.passwordHistory || [];
      if (history.some(p => p === newPass.trim())) {
        toast('Этот пароль уже использовался', 'err');
        return;
      }
      updatedEmp.passwordHistory = [...history.slice(-4), newPass.trim()];
    }
    setDb(prev => ({
      ...prev,
      employees: prev.employees.map(e => e.id === employeeId ? updatedEmp : e)
    }));
    audit('Редактирование сотрудника', `${updatedEmp.last} ${updatedEmp.first}`);
    toast('Данные сотрудника обновлены');
    onClose();
  };

  return (
    <Modal title={`Редактирование сотрудника — ${emp.last} ${emp.first}`} onClose={onClose} width={560}>
      <div className="form-grid">
        <label className="lbl">Фамилия *</label>
        <input className="inp" name="last" value={form.last} onChange={handleChange} />
        <label className="lbl">Имя *</label>
        <input className="inp" name="first" value={form.first} onChange={handleChange} />
        <label className="lbl">E-mail *</label>
        <input className="inp" name="email" value={form.email} onChange={handleChange} />
        <label className="lbl">Должность (основная)</label>
        <input className="inp" name="position" value={form.position} onChange={handleChange} />
        <label className="lbl">Телефон</label>
        <input className="inp" name="phone" value={form.phone} onChange={handleChange} />
        <label className="lbl">Внутренний номер</label>
        <input className="inp" name="extension" value={form.extension} onChange={handleChange} />
        <label className="lbl">Табельный №</label>
        <input className="inp" name="tab" value={form.tab} onChange={handleChange} />
        {isAdmin && (
          <>
            <label className="lbl">Новый пароль</label>
            <input className="inp" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          </>
        )}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={handleSave}>Сохранить</button>
      </div>
    </Modal>
  );
}