import { useState } from 'react';
import { Modal } from '../Modal';
import { ALLOWED_EMAIL_DOMAINS } from '../../utils/config';
import { ROLES } from '../../utils/constants';

export const CreateEmployeeModal = ({ db, store, onClose, toast, audit }) => {
  const [f, setF] = useState({
    last: '',
    first: '',
    email: '',
    phone: '',
    extension: '',
    tab: '',
    position: '',
    password: '',
    confirmPassword: '',
    roles: ['executor'],
    departments: [],
  });
  const [error, setError] = useState('');

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const validateEmail = (email) => {
    if (!email.includes('@')) {
      return 'Email должен содержать символ @';
    }
    const domain = email.split('@')[1].toLowerCase();
    if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
      return `Домен ${domain} не входит в список разрешённых. Разрешённые домены: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`;
    }
    return '';
  };

  const save = () => {
    setError('');

    // Проверка обязательных полей
    if (!f.last.trim() || !f.first.trim()) {
      setError('Фамилия и имя обязательны');
      return;
    }

    if (!f.email.trim()) {
      setError('Email обязателен');
      return;
    }

    const emailError = validateEmail(f.email);
    if (emailError) {
      setError(emailError);
      return;
    }

    // Проверка уникальности email
    const existingEmp = db.employees.find(e => e.email === f.email);
    if (existingEmp) {
      setError('Сотрудник с таким email уже существует');
      return;
    }

    if (!f.password || f.password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    if (f.password !== f.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    // Создание сотрудника
    const newEmp = {
      id: 'emp_' + Math.random().toString(36).slice(2, 8),
      last: f.last.trim(),
      first: f.first.trim(),
      email: f.email.trim().toLowerCase(),
      phone: f.phone.trim(),
      extension: f.extension.trim(),
      tab: f.tab.trim(),
      position: f.position.trim(),
      roles: f.roles,
      departments: f.departments,
      fired: false,
      createdAt: Date.now(),
    };

    // Хеширование пароля (упрощённо)
    newEmp.pass = btoa(f.password);

    store.upsertEmployee(newEmp);

    if (audit) {
      audit('Создание сотрудника', {
        employee: `${newEmp.last} ${newEmp.first}`,
        email: newEmp.email,
        roles: newEmp.roles.join(', '),
      });
    }

    toast('Сотрудник успешно создан', 'success');
    onClose();
  };

  return (
    <Modal title="Добавление сотрудника" onClose={onClose} width={560}>
      {error && <div className="login-err">{error}</div>}
      <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <label className="lbl">Фамилия *</label>
        <input className="inp" value={f.last} onChange={(e) => set('last', e.target.value)} />

        <label className="lbl">Имя *</label>
        <input className="inp" value={f.first} onChange={(e) => set('first', e.target.value)} />

        <label className="lbl">Email *</label>
        <input 
          className="inp" 
          type="email" 
          value={f.email} 
          onChange={(e) => set('email', e.target.value)}
          placeholder="ivanov@company.com"
        />
        <small className="mut" style={{ gridColumn: '2', fontSize: '11px', color: '#666' }}>
          Домен должен быть одним из: {ALLOWED_EMAIL_DOMAINS.join(', ')}
        </small>

        <label className="lbl">Телефон</label>
        <input className="inp" value={f.phone} onChange={(e) => set('phone', e.target.value)} />

        <label className="lbl">Внутренний номер</label>
        <input className="inp" value={f.extension} onChange={(e) => set('extension', e.target.value)} />

        <label className="lbl">Табельный номер</label>
        <input className="inp" value={f.tab} onChange={(e) => set('tab', e.target.value)} />

        <label className="lbl">Должность</label>
        <input className="inp" value={f.position} onChange={(e) => set('position', e.target.value)} />

        <label className="lbl">Пароль *</label>
        <input className="inp" type="password" value={f.password} onChange={(e) => set('password', e.target.value)} />

        <label className="lbl">Подтверждение пароля *</label>
        <input className="inp" type="password" value={f.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />

        <label className="lbl">Роль</label>
        <select className="inp sel" value={f.roles[0]} onChange={(e) => set('roles', [e.target.value])}>
          {Object.entries(ROLES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Создать</button>
      </div>
    </Modal>
  );
};
