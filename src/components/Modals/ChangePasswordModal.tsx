import { useState, useRef } from 'react';
import { Modal } from '../Modal';
import { Ic, ICONS } from '../Icons';
import { PASSWORD_AUTO_HIDE_MS } from '../../utils/config';

/**
 * Валидация пароля (аналогично регистрации)
 * @param {string} p - пароль для проверки
 * @returns {Array<{ok: boolean, t: string}>} массив проверок
 */
function passIssues(p) {
  return [
    { ok: p.length >= 8, t: "Минимум 8 символов" },
    { ok: /[A-ZА-ЯЁ]/.test(p), t: "Заглавная буква" },
    { ok: /[a-zа-яё]/.test(p), t: "Строчная буква" },
    { ok: /\d/.test(p), t: "Цифра" },
    { ok: /[^A-Za-zА-Яа-яЁё0-9]/.test(p), t: "Специальный символ" },
  ];
}

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
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const oldPassTimerRef = useRef(null);
  const newPassTimerRef = useRef(null);
  const confirmPassTimerRef = useRef(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const togglePasswordVisibility = (field, setState, timerRef) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (setState()) {
      // Уже видимый, скрываем
      setState(false);
    } else {
      // Скрытый, показываем
      setState(true);
      timerRef.current = setTimeout(() => {
        setState(false);
        timerRef.current = null;
      }, PASSWORD_AUTO_HIDE_MS);
    }
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
      const issues = passIssues(formData.newPassword);
      const failedChecks = issues.filter(i => !i.ok);
      if (failedChecks.length > 0) {
        newErrors.newPassword = failedChecks.map(i => i.t).join('; ');
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
      
      store.updateEmployee(updated);
      
      toast.success('Пароль успешно изменён.');
      onClose();
    } catch (error) {
      toast.error('Ошибка при смене пароля. Попробуйте позже.');
      console.error('Password change error:', error);
    } finally {
      setLoading(false);
    }
  };

  const issues = passIssues(formData.newPassword);

  return (
    <Modal title="Смена пароля" onClose={onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="lbl">Старый пароль *</label>
          <div style={{ position: 'relative' }}>
            <input
              className={`inp${errors.oldPassword ? ' error' : ''}`}
              type={showOldPass ? "text" : "password"}
              value={formData.oldPassword}
              onChange={e => handleChange('oldPassword', e.target.value)}
              placeholder="Введите текущий пароль"
              autoComplete="current-password"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('oldPassword', setShowOldPass, oldPassTimerRef)}
              className="pass-toggle-btn"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ic d={ICONS.eye} size={18} />
            </button>
          </div>
          {errors.oldPassword && <span className="error-text">{errors.oldPassword}</span>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="lbl">Новый пароль *</label>
          <div style={{ position: 'relative' }}>
            <input
              className={`inp${errors.newPassword ? ' error' : ''}`}
              type={showNewPass ? "text" : "password"}
              value={formData.newPassword}
              onChange={e => handleChange('newPassword', e.target.value)}
              placeholder="Придумайте новый пароль"
              autoComplete="new-password"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('newPassword', setShowNewPass, newPassTimerRef)}
              className="pass-toggle-btn"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ic d={ICONS.eye} size={18} />
            </button>
          </div>
          {errors.newPassword && <span className="error-text">{errors.newPassword}</span>}
          <div className="pass-checks">
            {issues.map((i) => (
              <span key={i.t} className={i.ok ? "ok" : ""}>
                ✓ {i.t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="lbl">Подтверждение нового пароля *</label>
          <div style={{ position: 'relative' }}>
            <input
              className={`inp${errors.confirmPassword ? ' error' : ''}`}
              type={showConfirmPass ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={e => handleChange('confirmPassword', e.target.value)}
              placeholder="Повторите новый пароль"
              autoComplete="new-password"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirmPassword', setShowConfirmPass, confirmPassTimerRef)}
              className="pass-toggle-btn"
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ic d={ICONS.eye} size={18} />
            </button>
          </div>
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>
      </div>

      <div className="modal-foot" style={{ marginTop: '16px' }}>
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
