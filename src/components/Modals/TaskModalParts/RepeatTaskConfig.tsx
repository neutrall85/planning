import { useState } from 'react';

/**
 * Компонент для работы с повторяющимися задачами
 * Отвечает за настройку расписания повторений
 */
export const RepeatTaskConfig = ({ 
  task, 
  readOnly, 
  canEditFields,
  onChange 
}) => {
  const [showPreview, setShowPreview] = useState(false);

  if (!canEditFields) return null;

  const repeatTypes = [
    { value: 'none', label: 'Не повторяется' },
    { value: 'daily', label: 'Ежедневно' },
    { value: 'weekly_days', label: 'По дням недели' },
    { value: 'workdays', label: 'Рабочие дни' },
    { value: 'monthly', label: 'Ежемесячно' },
    { value: 'yearly', label: 'Ежегодно' },
    { value: 'custom', label: 'Свой интервал' },
  ];

  const endTypes = [
    { value: 'never', label: 'Никогда' },
    { value: 'date', label: 'До даты' },
    { value: 'count', label: 'До количества' },
  ];

  const weekDays = [
    { value: '1', label: 'Пн' },
    { value: '2', label: 'Вт' },
    { value: '3', label: 'Ср' },
    { value: '4', label: 'Чт' },
    { value: '5', label: 'Пт' },
    { value: '6', label: 'Сб' },
    { value: '0', label: 'Вс' },
  ];

  const handleToggleDay = (day) => {
    const currentDays = task.repeatDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    onChange('repeatDays', newDays);
  };

  return (
    <div className="repeat-config">
      <h3>Повторение задачи</h3>
      
      <div className="form-group">
        <label>Тип повторения</label>
        <select
          value={task.repeatType || 'none'}
          onChange={(e) => onChange('repeatType', e.target.value)}
          disabled={readOnly}
        >
          {repeatTypes.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {task.repeatType !== 'none' && task.repeatType !== 'workdays' && (
        <div className="form-group">
          <label>Интервал</label>
          <input
            type="number"
            min="1"
            value={task.repeatInterval || 1}
            onChange={(e) => onChange('repeatInterval', parseInt(e.target.value) || 1)}
            disabled={readOnly}
          />
          <small>
            {task.repeatType === 'daily' && 'дней'}
            {task.repeatType === 'monthly' && 'месяцев'}
            {task.repeatType === 'yearly' && 'лет'}
            {task.repeatType === 'custom' && 'дней'}
          </small>
        </div>
      )}

      {task.repeatType === 'weekly_days' && (
        <div className="form-group">
          <label>Дни недели</label>
          <div className="week-days-selector">
            {weekDays.map(day => (
              <label key={day.value} className="day-checkbox">
                <input
                  type="checkbox"
                  value={day.value}
                  checked={(task.repeatDays || []).includes(day.value)}
                  onChange={() => handleToggleDay(day.value)}
                  disabled={readOnly}
                />
                {day.label}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="form-group">
        <label>Окончание повторения</label>
        <select
          value={task.repeatEndType || 'never'}
          onChange={(e) => onChange('repeatEndType', e.target.value)}
          disabled={readOnly}
        >
          {endTypes.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {task.repeatEndType === 'date' && (
        <div className="form-group">
          <label>Дата окончания</label>
          <input
            type="date"
            value={task.repeatEndValue || ''}
            onChange={(e) => onChange('repeatEndValue', e.target.value)}
            disabled={readOnly}
          />
        </div>
      )}

      {task.repeatEndType === 'count' && (
        <div className="form-group">
          <label>Количество повторений</label>
          <input
            type="number"
            min="1"
            max="100"
            value={task.repeatEndValue || ''}
            onChange={(e) => onChange('repeatEndValue', e.target.value)}
            disabled={readOnly}
          />
        </div>
      )}

      <div className="form-group">
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          disabled={readOnly}
        >
          {showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр дат'}
        </button>
      </div>

      {showPreview && (
        <div className="repeat-preview">
          <p>Предпросмотр дат будет реализован отдельно</p>
        </div>
      )}
    </div>
  );
};

export default RepeatTaskConfig;
