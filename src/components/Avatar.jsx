// src/components/Avatar.jsx
import React, { memo, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { initials } from '../utils/date';
import { DOMAIN } from '../utils/constants';

/**
 * Аватар сотрудника с тултипом при наведении.
 *
 * memo-компонент: рендерится в списках и канбане десятками, при
 * неизменном сотруднике не должен перерисовываться при изменении
 * чужих данных. Пропсы - employee (ссылка на объект), size, className;
 * memo сравнивает их стандартным shallow-equal.
 *
 * ВАЖНО: хуки вызываются до возможного return null. Раньше стоял
 * `if (!employee) return null;` перед useState/useRef - это нарушение
 * Rules of Hooks: если employee менялся с null на не-null (или наоборот)
 * на смонтированном компоненте, порядок хуков в двух рендерах различался,
 * и React падал с «Rendered fewer hooks than expected».
 *
 * Тултип показывает ФИО, служебный e-mail и (если есть) внутренний
 * телефон. Состав полей формируется здесь, а не приходит пропсом:
 * он одинаков во всех местах, где рендерится аватар, и не должен
 * зависеть от того, что вызывающий код счёл нужным передать.
 */
const Avatar = memo(function Avatar({ employee, size = 'sm', className = '' }) {
  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const ref = useRef(null);

  if (!employee) return null;

  // В employee.email хранится короткий логин без домена (так же, как
  // в моках и в поле ввода при логине). Тултип показывает полный
  // адрес - тот же формат, что в профиле кабинета.
  const tooltipText = [
    `${employee.last} ${employee.first}`,
    employee.email ? `E-mail: ${employee.email}@${DOMAIN}` : null,
    employee.extension ? `Вн. телефон: ${employee.extension}` : null,
  ].filter(Boolean).join('\n');

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setTooltip({
        visible: true,
        text: tooltipText,
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const classes = `avatar${size ? ' ' + size : ''}${className ? ' ' + className : ''}`;

  const avatarContent = employee.photo ? (
    <img
      src={employee.photo}
      alt={`${employee.first} ${employee.last}`}
      className={`${classes} avatar-img`}
    />
  ) : (
    <div className={`${classes} avatar-initials`}>
      {initials(employee.first, employee.last) || '?'}
    </div>
  );

  return (
    <>
      <span
        ref={ref}
        className="avatar-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {avatarContent}
      </span>

      {tooltip.visible &&
        createPortal(
          <div
            className="avatar-tooltip"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translateX(-50%) translateY(-100%)',
            }}
          >
            {tooltip.text}
          </div>,
          document.body
        )
      }
    </>
  );
});

export default Avatar;