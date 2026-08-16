import React, { useState } from 'react';

/**
 * Компонент для учета рабочего времени (Work Logs)
 */
export const TaskWorkLogs = ({ 
  task, 
  readOnly, 
  canRequestHours,
  onAddLog, 
  onRequestHours,
  empName 
}) => {
  const [hours, setHours] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleAddLog = () => {
    const hoursNum = parseFloat(hours);
    if (!hoursNum || hoursNum <= 0) {
      alert('Введите корректное количество часов');
      return;
    }
    
    onAddLog({
      hours: hoursNum,
      note,
      date,
      timestamp: new Date().toISOString()
    });
    
    setHours('');
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const totalSpent = task.logs?.reduce((sum, log) => sum + (log.hours || 0), 0) || 0;
  const remaining = (task.plannedHours || 0) - totalSpent;

  return (
    <div className="task-work-logs">
      <h3>Учет рабочего времени</h3>
      
      {/* Сводка */}
      <div className="work-logs-summary">
        <div className="summary-item">
          <strong>План:</strong> {task.plannedHours || 0} ч.
        </div>
        <div className="summary-item">
          <strong>Факт:</strong> {totalSpent} ч.
        </div>
        <div className={`summary-item ${remaining < 0 ? 'overdue' : ''}`}>
          <strong>Остаток:</strong> {remaining} ч.
        </div>
      </div>

      {/* История записей */}
      {task.logs && task.logs.length > 0 && (
        <div className="work-logs-history">
          <h4>История записей</h4>
          <ul>
            {task.logs.map((log, index) => (
              <li key={index} className="work-log-entry">
                <span className="log-date">{log.date}</span>
                <span className="log-hours">{log.hours} ч.</span>
                <span className="log-note">{log.note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Форма добавления записи */}
      {!readOnly && (
        <div className="work-logs-form">
          <h4>Добавить запись</h4>
          
          <div className="form-row">
            <div className="form-group">
              <label>Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label>Часы</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0.5"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Комментарий</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Что было сделано?"
              rows={3}
            />
          </div>
          
          <button 
            type="button" 
            onClick={handleAddLog}
            className="btn-primary"
          >
            Добавить запись
          </button>
        </div>
      )}

      {/* Кнопка запроса часов */}
      {canRequestHours && !readOnly && (
        <div className="work-logs-request">
          <button 
            type="button" 
            onClick={() => onRequestHours(task)}
            className="btn-secondary"
          >
            Запросить изменение часов
          </button>
        </div>
      )}
    </div>
  );
};

export default TaskWorkLogs;
