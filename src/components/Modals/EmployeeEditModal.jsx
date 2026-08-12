import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { COMPANY_DOMAIN } from '../../utils/config';
import { useDataHelpers } from '../../hooks';

export const EmployeeEditModal = ({ db, store, ur, empId, onClose, toast }) => {
  const isAdmin = ur.roles.includes('admin');
  const canEditAll = isAdmin; // Только суперадмин может менять всё
  const [isEditing, setIsEditing] = useState(false); // Режим редактирования для обычных пользователей

  const getLocalPart = (email) => {
    if (!email) return '';
    return email.split('@')[0];
  };

  const currentEmp = db.employees.find(e => e.id === empId);

  const [f, setF] = useState({
    last: currentEmp?.last || '',
    first: currentEmp?.first || '',
    email: getLocalPart(currentEmp?.email),
    phone: currentEmp?.phone || '',
    extension: currentEmp?.extension || '',
    tab: currentEmp?.tab || '',
    position: currentEmp?.position || '',
  });

  useEffect(() => {
    if (currentEmp) {
      setF({
        last: currentEmp.last || '',
        first: currentEmp.first || '',
        email: getLocalPart(currentEmp.email),
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

      toast.success('Данные обновлены');
      onClose();
      return; // Важно: прекращаем выполнение, чтобы не идти дальше
    }

    // Суперадмин может менять всё
    if (!f.last.trim() || !f.first.trim()) {
      toast.error('Имя и фамилия обязательны');
      return;
    }
    let localPart = f.email.trim();
    if (localPart.includes('@')) {
      localPart = localPart.split('@')[0];
    }
    if (!localPart) {
      toast.error('Введите логин (часть email до @)');
      return;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(localPart)) {
      toast.error('Логин может содержать только латиницу, цифры, точки, дефис и подчёркивание');
      return;
    }
    const fullEmail = `${localPart}@${COMPANY_DOMAIN}`;

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
    };

    store.updateEmployee(updated);

    toast.success('Данные обновлены');
    onClose();
  };

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
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
};