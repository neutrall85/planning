import React, { useState } from 'react';
import { Modal } from '../Modal';
import { uid } from '../../utils/date';

export const HoursRequestModal = ({ db, ur, kind, targetId, onClose, onSubmit }) => {
  const target = kind === "task" ? db.tasks.find((t) => t.id === targetId) : db.projects.find((p) => p.id === targetId);
  const cur = kind === "task" ? target?.plannedHours : target?.budget;
  const [newH, setNewH] = useState(cur);
  const [reason, setReason] = useState("");
  
  // Определяем, кто утверждает запрос: ГК для своих КБ, иначе ГД
  const project = kind === "task" ? db.projects.find(p => p.id === target?.projectId) : target;
  const isKbProject = project && project.kbId;
  const approverText = isKbProject ? "главному конструктору вашего КБ" : "генеральному директору";
  
  return (
    <Modal title={`Запрос изменения часов — ${kind === "task" ? "задача" : "бюджет проекта"}`} onClose={onClose} width={480}>
      <p className="mut sm">{kind === "task" ? target?.title : target?.name}. Запрос будет направлен {approverText}.</p>
      <div className="form-grid">
        <label className="lbl">Текущее значение</label><input className="inp" disabled value={(cur ?? "—") + " ч"} />
        <label className="lbl">Новое значение *</label><input className="inp" type="number" min="1" step="0.5" value={newH} onChange={(e) => setNewH(e.target.value)} />
        <label className="lbl">Обоснование *</label><textarea className="inp" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Почему требуется изменение…" />
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" disabled={!reason.trim() || !newH} onClick={() => onSubmit({ id: uid(), kind, targetId, oldH: cur, newH: +newH, reason: reason.trim(), reqId: ur.id, status: "pending", ts: Date.now() })}>Отправить запрос</button>
      </div>
    </Modal>
  );
};