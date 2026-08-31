import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { initials } from '../utils/date';

export default function Avatar({ employee, size = 'sm', className = '' }) {
  if (!employee) return null;

  const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
  const ref = useRef(null);

  const tooltipText = `${employee.last} ${employee.first}` +
    (employee.extension ? `\nВн. телефон: ${employee.extension}` : '');

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

  const baseClass = 'avatar';
  const sizeClass = size ? ` ${size}` : '';
  const classes = `${baseClass}${sizeClass}${className ? ' ' + className : ''}`;

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
}