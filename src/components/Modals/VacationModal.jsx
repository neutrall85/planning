// VacationModal.jsx
import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useDataHelpers } from '../../hooks';
import { VACATION_TYPES, TASK_STATUSES } from '../../utils/constants';
import { TODAY, iso, addDays, uid, fmtDMY } from '../../utils/date';
import { canManageAllVacations } from '../../utils/permissions';
import { getPrimaryDeptName } from '../../utils/helpers'; // <-- добавлен импорт

export const VacationModal = ({ db, ur, vacationId, forEmpId, onClose, onSave }) => {
  const existing = vacationId ? db.vacations.find((v) => v.id === vacationId) : null;
  const canPick = canManageAllVacations(ur);
  const { empName, primaryDept } = useDataHelpers(db);
  const [f, setF] = useState(existing ? { ...existing, delegation: { ...existing.delegation } } : {
    id: "v_" + uid(), empId: forEmpId || ur.id, start: TODAY, end: iso(addDays(new Date(), 7)), type: "annual", comment: "",
    status: canManageAllVacations(ur) && forEmpId ? "approved" : "pending",
    delegation: { enabled: false, subId: "", statuses: [], state: null },
  });
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const save = () => {
    setError('');
    if (!f.start || !f.end || f.end < f.start) {
      setError('Даты указаны некорректно');
      return;
    }
    if (f.delegation.enabled && !f.delegation.subId) {
      setError('Для делегирования необходимо выбрать замещающего сотрудника');
      return;
    }
    onSave({ ...f }, !existing);
  };

  // Для выбора сотрудника (если есть право)
  const renderEmployeeSelect = () => {
    if (!canPick) return null;
    return (
      <>
        <label className="lbl">Сотрудник *</label>
        <select className="inp sel" value={f.empId} onChange={(e) => set("empId", e.target.value)}>
          {db.employees.map((e) => (
            <option key={e.id} value={e.id}>
              {empName(e.id)} — {getPrimaryDeptName(e, db)}
            </option>
          ))}
        </select>
      </>
    );
  };

  return (
    <Modal title={existing ? "Отпуск" : "Новый отпуск"} onClose={onClose} width={560}>
      {error && <div className="login-err">{error}</div>}
      <div className="form-grid">
        {renderEmployeeSelect()}
        <label className="lbl">Дата начала *</label><input className="inp" type="date" value={f.start} onChange={(e) => set("start", e.target.value)} />
        <label className="lbl">Дата окончания *</label><input className="inp" type="date" value={f.end} onChange={(e) => set("end", e.target.value)} />
        <label className="lbl">Тип отпуска *</label>
        <select className="inp sel" value={f.type} onChange={(e) => set("type", e.target.value)}>
          {Object.entries(VACATION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="lbl">Комментарий</label><input className="inp" value={f.comment} onChange={(e) => set("comment", e.target.value)} />
        {canManageAllVacations(ur) && (
          <>
            <label className="lbl">Статус</label>
            <select className="inp sel" value={f.status} onChange={(e) => set("status", e.target.value)}>
              <option value="pending">На утверждении</option>
              <option value="approved">Утверждён</option>
              <option value="rejected">Отклонён</option>
            </select>
          </>
        )}
      </div>
      <div className="tm-block">
        <label className="roles-item" style={{ border: "none", padding: 0 }}>
          <input type="checkbox" checked={f.delegation.enabled} onChange={(e) => {
            set("delegation", { ...f.delegation, enabled: e.target.checked });
            if (!e.target.checked) set("delegation", { ...f.delegation, enabled: false, subId: "" });
          }} />
          <b>Делегировать задачи на время отпуска</b>
        </label>
        {f.delegation.enabled && (
          <>
            <label className="lbl">Замещающий сотрудник *</label>
            <select
              className="inp sel"
              value={f.delegation.subId}
              onChange={(e) => set("delegation", { ...f.delegation, subId: e.target.value })}
              style={{ borderColor: f.delegation.enabled && !f.delegation.subId ? '#dc2626' : '' }}
            >
              <option value="">— выберите —</option>
              {db.employees.filter((e) => e.id !== f.empId).map((e) => (
                <option key={e.id} value={e.id}>{empName(e.id)} — {getPrimaryDeptName(e, db)}</option>
              ))}
            </select>
            {f.delegation.enabled && !f.delegation.subId && (
              <div className="error-message show" style={{ gridColumn: '2' }}>Выберите замещающего сотрудника</div>
            )}
            <label className="lbl">Какие задачи делегировать</label>
            <div className="sub-picks">
              {["new", "inwork", "review"].map((st) => (
                <label key={st} className="dept-pick">
                  <input type="checkbox" checked={f.delegation.statuses.includes(st)} onChange={() => set("delegation", { ...f.delegation, statuses: f.delegation.statuses.includes(st) ? f.delegation.statuses.filter((x) => x !== st) : [...f.delegation.statuses, st] })} />
                  {TASK_STATUSES[st].label}
                </label>
              ))}
              <span className="mut sm">пусто = все активные задачи</span>
            </div>
            <p className="mut sm">Делегирование утверждает руководитель до начала отпуска. Задачи вернутся автоматически после окончания отпуска. Задачи, где сотрудник — ответственный по проекту, передаются только через делегирование ролей.</p>
          </>
        )}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
};