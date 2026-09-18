// src/hooks/useTaskTimeLog.js
import { useCallback, useState } from 'react';
import { TODAY, uid } from '../utils/date';

/**
 * Внесение часов по задаче (вкладка «Учёт времени»).
 *
 * logs сохраняются отдельным вызовом store.patchTask - точечно, чтобы
 * не тащить за собой несохранённые правки остальной формы (logs не
 * входит в FORM_FIELDS, см. useTaskFormState).
 */
export function useTaskTimeLog({ values, existing, store, ur, toast, setFieldValue, getTaskSpent }) {
  const [logHours, setLogHours] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logDate, setLogDate] = useState(TODAY);

  const addLog = useCallback(() => {
    const h = parseFloat(logHours);
    if (!h || h <= 0) { toast('Введите корректное количество часов', 'error'); return; }
    const sp = getTaskSpent(values);
    if (values.plannedHours && sp + h > values.plannedHours) {
      toast(`Нельзя внести больше плановых: доступно ещё ${Math.max(0, values.plannedHours - sp)} часов`, 'error');
      return;
    }
    const newLog = { id: uid(), userId: ur.id, date: logDate, hours: h, note: logNote.trim() };
    const newLogs = [...values.logs, newLog];
    if (existing) store.patchTask(existing.id, { logs: newLogs });
    setFieldValue('logs', newLogs);
    setLogHours('');
    setLogNote('');
    toast('Часы учтены', 'success');
  }, [logHours, logNote, logDate, values, existing, store, ur, toast, setFieldValue, getTaskSpent]);

  return { logHours, setLogHours, logNote, setLogNote, logDate, setLogDate, addLog };
}
