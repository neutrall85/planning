import React, { useState } from 'react';
import { Modal } from './Modal';
import { uid } from '../utils/date';
import { ROLES } from '../utils/constants';

export default function CreateEmployeeModal({ db, setDb, onClose, toast, audit }) {
  const [form, setForm] = useState({
    last: '',
    first: '',
    email: '',
    pass: '',
    position: 'Сотрудник',
    departments: [],
    roles: ['executor'],
    phone: '',
    extension: '',
    tab: String(1000 + Math.floor(Math.random() * 8999)),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!form.last.trim() || !form.first.trim() || !form.email.trim() || !form.pass.trim()) {
      toast('Заполните все обязательные поля', 'err');
      return;
    }
    if (db.employees.some(e => e.email === form.email)) {
      toast('Сотрудник с таким email уже существует', 'err');
      return;
    }
    // Проверка пароля
    if (form.pass.length < 8) {
      toast('Пароль должен быть не менее 8 символов', 'err');
      return;
    }
    const newEmp = {
      id: 'e_' + uid(),
      last: form.last.trim(),
      first: form.first.trim(),
      email: form.email.trim(),
      pass: form.pass,
      position: form.position || 'Сотрудник',
      departments: form.departments,
      roles: form.roles,
      kbIds: [],
      headDeptIds: [],
      phone: form.phone || '',
      extension: form.extension || '',
      tab: form.tab || String(1000 + Math.floor(Math.random() * 8999)),
      notif: { deadlineEmail: true, overdueDigest: false, commentSub: true },
      failed: 0,
      lockUntil: 0,
      fired: false,
      photo: null,
      passwordHistory: []
    };
    setDb(prev => ({
      ...prev,
      employees: [...prev.employees, newEmp]
    }));
    audit('Создание сотрудника', `${newEmp.last} ${newEmp.first}`);
    toast('Сотрудник создан');
    onClose();
  };

  return (
    <Modal title="Добавить сотрудника" onClose={onClose} width={560}>
      <div className="form-grid">
        <label className="lbl">Фамилия *</label>
        <input className="inp" name="last" value={form.last} onChange={handleChange} />
        <label className="lbl">Имя *</label>
        <input className="inp" name="first" value={form.first} onChange={handleChange} />
        <label className="lbl">E-mail *</label>
        <input className="inp" name="email" value={form.email} onChange={handleChange} />
        <label className="lbl">Пароль *</label>
        <input className="inp" type="password" name="pass" value={form.pass} onChange={handleChange} />
        <label className="lbl">Должность</label>
        <input className="inp" name="position" value={form.position} onChange={handleChange} />
        <label className="lbl">Телефон</label>
        <input className="inp" name="phone" value={form.phone} onChange={handleChange} />
        <label className="lbl">Внутренний номер</label>
        <input className="inp" name="extension" value={form.extension} onChange={handleChange} />
        <label className="lbl">Табельный №</label>
        <input className="inp" name="tab" value={form.tab} onChange={handleChange} />
        <label className="lbl">Роли (по умолчанию исполнитель)</label>
        <div className="sub-picks">
          {Object.keys(ROLES).map(r => (
            <label key={r} className="dept-pick">
              <input
                type="checkbox"
                checked={form.roles.includes(r)}
                onChange={() => {
                  setForm(prev => ({
                    ...prev,
                    roles: prev.roles.includes(r) ? prev.roles.filter(x => x !== r) : [...prev.roles, r]
                  }));
                }}
              />
              {ROLES[r].label}
            </label>
          ))}
        </div>
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={handleSubmit}>Создать</button>
      </div>
    </Modal>
  );
}