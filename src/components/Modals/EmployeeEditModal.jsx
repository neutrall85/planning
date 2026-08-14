import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { COMPANY_DOMAIN, ALLOWED_EMAIL_DOMAINS } from '../../utils/config';
import { useDataHelpers } from '../../hooks';

export const EmployeeEditModal = ({ db, store, ur, empId, onClose, toast }) => {
  const isAdmin = ur.roles.includes('admin');
  const canEditAll = isAdmin; // Только суперадмин может менять всё
  const [isEditing, setIsEditing] = useState(false); // Режим редактирования для обычных пользователей
  const [showResetPassword, setShowResetPassword] = useState(false);
  
  // Получаем данные сотрудника по empId
  const currentEmp = db.employees?.find(e => e.id === empId);
  
  // Инициализируем форму пустыми значениями, если сотрудник не найден
  const [f, setF] = useState({
    last: '',
    first: '',
    email: '',
    phone: '',
    extension: '',
    tab: '',
    position: '',
  });

  useEffect(() => {
    if (currentEmp) {
      setF({
        last: currentEmp.last || '',
        first: currentEmp.first || '',
        email: currentEmp.email || '',
        phone: currentEmp.phone || '',
        extension: currentEmp.extension || '',
        tab: currentEmp.tab || '',
        position: currentEmp.position || '',
      });
    }
  }, [currentEmp]);

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const save = () => {
    if (!canEditAll) {
      // Обычные пользователи могут менять только phone и extension
      const updated = {
        ...currentEmp,
        phone: f.phone || '',
        extension: f.extension || '',
      };
      const changes = [];
      if ((currentEmp.phone || '') !== (f.phone || '')) changes.push(`Телефон: "${currentEmp.phone || ''}" → "${f.phone || ''}"`);
      if ((currentEmp.extension || '') !== (f.extension || '')) changes.push(`Внутр. номер: "${currentEmp.extension || ''}" → "${f.extension || ''}"`);

      if (changes.length === 0) {
        toast.info('Нет изменений');
        return;
      }

      store.updateEmployee(updated);
      store.addAudit('Изменение контактных данных', `${currentEmp.last} ${currentEmp.first}: ${changes.join('; ')}`);

      toast.success('Данные обновлены');
      onClose();
      return; // Важно: прекращаем выполнение, чтобы не идти дальше
    }

    // Суперадмин может менять всё
    if (!f.last.trim() || !f.first.trim()) {
      toast.error('Имя и фамилия обязательны');
      return;
    }
    // Требуем полный email - без авто-добавления домена
    let fullEmail = f.email.trim();
    if (!fullEmail.includes('@')) {
      toast.error('Введите полный e-mail (например, ivanov@company.com)');
      return;
    }
    // Извлекаем домен и проверяем его наличие в списке разрешённых
    const emailDomain = fullEmail.split('@')[1];
    if (!ALLOWED_EMAIL_DOMAINS.includes(emailDomain)) {
      toast.error(`Домен "${emailDomain}" не входит в список разрешённых. Разрешённые домены: ${ALLOWED_EMAIL_DOMAINS.join(', ')}`);
      return;
    }

    const existing = db.employees.find(e =>
      e.id !== currentEmp.id && e.email.toLowerCase() === fullEmail.toLowerCase()
    );
    if (existing) {
      toast.error('Такой email уже используется другим сотрудником');
      return;
    }

    const changes = [];
    if (currentEmp.last !== f.last.trim()) changes.push(`Фамилия: "${currentEmp.last}" → "${f.last.trim()}"`);
    if (currentEmp.first !== f.first.trim()) changes.push(`Имя: "${currentEmp.first}" → "${f.first.trim()}"`);
    if (currentEmp.email !== fullEmail) changes.push(`Email: "${currentEmp.email}" → "${fullEmail}"`);
    if ((currentEmp.phone || '') !== (f.phone || '')) changes.push(`Телефон: "${currentEmp.phone || ''}" → "${f.phone || ''}"`);
    if ((currentEmp.extension || '') !== (f.extension || '')) changes.push(`Внутр. номер: "${currentEmp.extension || ''}" → "${f.extension || ''}"`);
    if ((currentEmp.tab || '') !== (f.tab || '')) changes.push(`Табельный №: "${currentEmp.tab || ''}" → "${f.tab || ''}"`);
    if ((currentEmp.position || '') !== (f.position || '')) changes.push(`Должность: "${currentEmp.position || ''}" → "${f.position || ''}"`);

    if (changes.length === 0) {
      toast.info('Нет изменений');
      return;
    }

    const updated = {
      ...currentEmp,
      last: f.last.trim(),
      first: f.first.trim(),
      email: fullEmail,
      phone: f.phone || '',
      extension: f.extension || '',
      tab: f.tab || '',
      position: f.position || '',
      // Сохраняем пароль и историю паролей без изменений
      pass: currentEmp.pass,
      passwordHistory: currentEmp.passwordHistory,
    };

    store.updateEmployee(updated);
    store.addAudit('Изменение данных сотрудника', `${currentEmp.last} ${currentEmp.first}: ${changes.join('; ')}`);

    toast.success('Данные обновлены');
    onClose();
  };

  // Функция генерации надежного пароля
  const generatePassword = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let password = '';
    password += upper[Math.floor(Math.random() * upper.length)];
    password += lower[Math.floor(Math.random() * lower.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    const allChars = upper + lower + digits + special;
    for (let i = 0; i < 8; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Перемешиваем символы
    return password.split('').sort(() => Math.random() - 0.5).join('');
  };

  // Функция сброса пароля суперадмином
  const handleResetPassword = () => {
    setShowResetPassword(true);
  };

  const confirmResetPassword = () => {
    if (!newPassword) {
      toast.error('Введите пароль');
      return;
    }
    
    // Валидация пароля
    const issues = [
      { ok: newPassword.length >= 8, t: "Минимум 8 символов" },
      { ok: /[A-ZА-ЯЁ]/.test(newPassword), t: "Заглавная буква" },
      { ok: /[a-zа-яё]/.test(newPassword), t: "Строчная буква" },
      { ok: /\d/.test(newPassword), t: "Цифра" },
      { ok: /[^A-Za-zА-Яа-яЁё0-9]/.test(newPassword), t: "Специальный символ" },
    ];
    const failedChecks = issues.filter(i => !i.ok);
    if (failedChecks.length > 0) {
      toast.error(`Пароль не соответствует требованиям: ${failedChecks.map(i => i.t).join('; ')}`);
      return;
    }

    // Проверка истории паролей
    const history = currentEmp.passwordHistory || [];
    if (history.includes(newPassword)) {
      toast.error('Этот пароль уже использовался ранее. Выберите другой.');
      return;
    }

    const updated = {
      ...currentEmp,
      pass: newPassword,
      passwordHistory: [...history.slice(-4), newPassword],
    };

    store.updateEmployee(updated);
    store.addAudit('Сброс пароля сотрудника', `${currentEmp.last} ${currentEmp.first} (суперадмином)`);
    toast.success('Пароль успешно сброшен');
    setShowResetPassword(false);
    setNewPassword('');
  };

  const [newPassword, setNewPassword] = useState('');

  return (
    <Modal title={`Редактирование сотрудника${isAdmin ? ' (админ)' : ''}`} onClose={onClose} width={560}>

      <div className="form-grid">
        <label className="lbl">Фамилия *</label>
        <input className="inp" value={f.last} onChange={e => set('last', e.target.value)} disabled={!canEditAll} />

        <label className="lbl">Имя *</label>
        <input className="inp" value={f.first} onChange={e => set('first', e.target.value)} disabled={!canEditAll} />

        <label className="lbl">E-mail</label>
        <input
          className="inp"
          value={f.email}
          onChange={e => set('email', e.target.value)}
          disabled={!canEditAll}
        />

        <label className="lbl">Должность</label>
        <input className="inp" value={f.position} onChange={e => set('position', e.target.value)} disabled={!canEditAll} />

        {!canEditAll && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gridColumn: '1 / -1' }}>
            <label className="lbl" style={{ margin: 0 }}>Контактные данные (редактируемые)</label>
          </div>
        )}

        <label className="lbl">Мобильный телефон</label>
        <input
          className="inp"
          value={f.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="+7 (___) ___-__-__"
        />

        <label className="lbl">Внутренний номер</label>
        <input
          className="inp"
          value={f.extension}
          onChange={e => set('extension', e.target.value)}
          placeholder="1234"
        />

        <label className="lbl">Табельный №</label>
        <input
          className="inp"
          value={f.tab}
          onChange={e => set('tab', e.target.value)}
          disabled={!canEditAll}
        />
      </div>

      <div className="modal-foot">
        <div className="spacer" />
        {isAdmin && (
          <button 
            className="btn ghost danger" 
            onClick={handleResetPassword}
            style={{ marginRight: 'auto' }}
          >
            Сбросить пароль
          </button>
        )}
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>

      {showResetPassword && (
        <Modal title="Сброс пароля сотрудника" onClose={() => setShowResetPassword(false)} width={500}>
          <div style={{ marginBottom: '20px' }}>
            <p style={{ marginBottom: '15px', color: '#666' }}>
              Сотрудник: <strong>{currentEmp?.last} {currentEmp?.first}</strong>
            </p>
            <label className="lbl" style={{ display: 'block', marginBottom: '8px' }}>
              Новый пароль:
            </label>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <input
                type="password"
                className="inp"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Введите или сгенерируйте пароль"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn ghost"
                onClick={() => setNewPassword(generatePassword())}
                title="Сгенерировать надежный пароль"
              >
                🎲 Сгенерировать
              </button>
            </div>
            <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.6' }}>
              <strong>Требования к паролю:</strong>
              <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
                <li>Минимум 8 символов</li>
                <li>Заглавная буква (A-Z, А-Я)</li>
                <li>Строчная буква (a-z, а-я)</li>
                <li>Цифра (0-9)</li>
                <li>Специальный символ (!@#$%^&*...)</li>
              </ul>
            </div>
          </div>
          <div className="modal-foot">
            <button className="btn ghost" onClick={() => setShowResetPassword(false)}>Отмена</button>
            <button className="btn primary" onClick={confirmResetPassword}>Сбросить пароль</button>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
