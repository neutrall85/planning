import React, { useState } from 'react';
import { Modal } from '../Modal';
import validation from '../../utils/validation';
import { PASSWORD_MIN_LENGTH } from '../../utils/config';

const { schemas } = validation;

/**
 * Модалка смены пароля с валидацией старого пароля и проверкой сложности нового
 */
export const ChangePasswordModal = ({ user, store, onClose, toast }) => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validatePasswordStrength = (password) => {
    const result = schemas.password.safeParse(password);
    if (!result.success) {
      return result.error.errors.map(e => e.message).join('; ');
    }
    return null;
  };

  const handleSubmit = async () => {
    const newErrors = {};

    // Проверка старого пароля
    if (!formData.oldPassword) {
      newErrors.oldPassword = 'Введите старый пароль';
    } else if (formData.oldPassword !== user.pass) {
      newErrors.oldPassword = 'Неверный старый пароль';
    }

    // Проверка нового пароля
    if (!formData.newPassword) {
      newErrors.newPassword = 'Введите новый пароль';
    } else {
      const strengthError = validatePasswordStrength(formData.newPassword);
      if (strengthError) {
        newErrors.newPassword = strengthError;
      }
    }

    // Проверка подтверждения пароля
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Подтвердите новый пароль';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }

    // Проверка истории паролей
    if (formData.newPassword && !newErrors.newPassword) {
      const history = user.passwordHistory || [];
      if (history.includes(formData.newPassword)) {
        newErrors.newPassword = 'Этот пароль уже использовался ранее. Выберите другой.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      // Обновление пароля
      const updated = {
        ...user,
        pass: formData.newPassword,
        passwordHistory: [...(user.passwordHistory || []).slice(-4), formData.newPassword],
      };
      
      store.upsertEmployee(updated);
      
      toast.success('Пароль успешно изменён. На вашу почту отправлено подтверждение.');
      onClose();
    } catch (error) {
      toast.error('Ошибка при смене пароля. Попробуйте позже.');
      console.error('Password change error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="Смена пароля" onClose={onClose} width={480}>
      <div className="form-grid" style={{ gap: '16px' }}>
        <label className="lbl">
          Старый пароль *
          <input
            className={`inp${errors.oldPassword ? ' error' : ''}`}
            type="password"
            value={formData.oldPassword}
            onChange={e => handleChange('oldPassword', e.target.value)}
            placeholder="Введите текущий пароль"
            autoComplete="current-password"
          />
          {errors.oldPassword && <span className="error-text">{errors.oldPassword}</span>}
        </label>

        <label className="lbl">
          Новый пароль *
          <input
            className={`inp${errors.newPassword ? ' error' : ''}`}
            type="password"
            value={formData.newPassword}
            onChange={e => handleChange('newPassword', e.target.value)}
            placeholder="Придумайте новый пароль"
            autoComplete="new-password"
          />
          {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}
          {!errors.newPassword && formData.newPassword && (
            <span className="mut sm" style={{ display: 'block', marginTop: '4px' }}>
              Требования: минимум {PASSWORD_MIN_LENGTH} символов, заглавные и строчные буквы, цифры, спецсимволы
            </span>
          )}
        </label>

        <label className="lbl">
          Подтверждение нового пароля *
          <input
            className={`inp${errors.confirmPassword ? ' error' : ''}`}
            type="password"
            value={formData.confirmPassword}
            onChange={e => handleChange('confirmPassword', e.target.value)}
            placeholder="Повторите новый пароль"
            autoComplete="new-password"
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </label>
      </div>

      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose} disabled={loading}>
          Отмена
        </button>
        <button 
          className="btn primary" 
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? 'Сохранение...' : 'Сменить пароль'}
        </button>
      </div>
    </Modal>
  );
};
