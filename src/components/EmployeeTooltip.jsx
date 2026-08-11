import React from 'react';
import { fmtD } from '../utils/date';

/**
 * Всплывающее окно с информацией о сотруднике
 * @param {Object} employee - Объект сотрудника
 * @param {string} employee.first - Имя
 * @param {string} employee.last - Фамилия  
 * @param {string} employee.phone - Мобильный телефон
 * @param {string} employee.extension - Внутренний номер
 * @param {string} employee.email - Email
 * @param {boolean} visible - Видимость tooltip
 * @param {number} x - Позиция X
 * @param {number} y - Позиция Y
 */
export default function EmployeeTooltip({ employee, visible, x, y }) {
  if (!visible || !employee) return null;

  const fullName = `${employee.last} ${employee.first}`;
  const internalPhone = employee.extension ? ` ${employee.extension}` : '';
  const email = employee.email ? `${employee.email}@aeroplan.ru` : '';

  return (
    <div 
      className="employee-tooltip"
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 9999,
        pointerEvents: 'none',
        background: '#1e293b',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        whiteSpace: 'nowrap',
        transform: 'translate(8px, 8px)'
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{fullName}</div>
      {internalPhone && <div style={{ fontSize: '12px', opacity: 0.9 }}>Вн. тел: {internalPhone}</div>}
      {email && <div style={{ fontSize: '12px', opacity: 0.9 }}>{email}</div>}
    </div>
  );
}
