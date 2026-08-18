import { useState } from 'react';
import { Modal } from '../Modal';
import { ROLES } from '../../utils/constants';
import { TODAY, iso, addDays, uid } from '../../utils/date';

export const DelegationModal = ({ db, ur, onClose, onSubmit }) => {
  const [toId, setToId] = useState("");
  const [roles, setRoles] = useState([]);
  const [start, setStart] = useState(TODAY);
  const [end, setEnd] = useState(iso(addDays(new Date(), 14)));
  const [openEnd, setOpenEnd] = useState(false);
  const [reason, setReason] = useState("");
  // Генеральный директор может делегировать свою роль, администратор - нет
  const allowed = ur.roles.filter((r) => !["admin", "executor"].includes(r));
  return (
    <Modal title="Временная передача ролей" onClose={onClose} width={520}>
      <div className="form-grid">
        <label className="lbl">Сотрудник-получатель *</label>
        <select className="inp sel" value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">— выберите —</option>
          {db.employees.filter((e) => e.id !== ur.id).map((e) => <option key={e.id} value={e.id}>{e.last} {e.first}</option>)}
        </select>
        <label className="lbl">Передаваемые роли *</label>
        <div className="sub-picks">
          {allowed.length ? allowed.map((r) => <label key={r} className="dept-pick"><input type="checkbox" checked={roles.includes(r)} onChange={() => setRoles((s) => s.includes(r) ? s.filter((x) => x !== r) : [...s, r])} />{ROLES[r].label}</label>) : <span className="mut sm">Нет ролей, доступных для передачи</span>}
        </div>
        <label className="lbl">Дата начала *</label><input className="inp" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <label className="lbl">Дата окончания</label>
        <div className="duo"><input className="inp" type="date" disabled={openEnd} value={end} onChange={(e) => setEnd(e.target.value)} /><label className="dept-pick"><input type="checkbox" checked={openEnd} onChange={(e) => setOpenEnd(e.target.checked)} /> до отмены</label></div>
        <label className="lbl">Обоснование *</label><textarea className="inp" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" disabled={!toId || !roles.length || !reason.trim()} onClick={() => onSubmit({ id: uid(), fromId: ur.id, toId, roles, start, end: openEnd ? null : end, reason: reason.trim(), status: "pending" })}>Отправить запрос</button>
      </div>
    </Modal>
  );
};