import { useState } from 'react';
import { Modal } from '../Modal';
import { ROLES } from '../../utils/constants';

export const RolesModal = ({ db, store, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [roles, setRoles] = useState(emp.roles);
  const [kbIds, setKbIds] = useState(emp.kbIds || []);
  const [headDeptIds, setHeadDeptIds] = useState(emp.headDeptIds || []);
  const toggle = (r) => setRoles((s) => (s.includes(r) ? s.filter((x) => x !== r) : [...s, r]));
  const save = () => {
    const updatedEmp = { ...emp, roles, kbIds: roles.includes("kb_chief") ? kbIds : [], headDeptIds: roles.includes("head") ? headDeptIds : [] };
    store.updateEmployee(updatedEmp);
    audit("Назначение ролей", `${emp.last} ${emp.first}: ${roles.map((r) => ROLES[r].short).join(", ")}`);
    toast("Роли сохранены", "success");
    onClose();
  };
  return (
    <Modal title={`Роли — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">Сотрудник может иметь несколько ролей. Для «Главного конструктора» укажите КБ, для «Руководителя отдела» — перечень отделов.</p>
      <div className="roles-list">
        {Object.entries(ROLES).map(([k, v]) => (
          <div key={k}>
            <label className="roles-item">
              <input type="checkbox" checked={roles.includes(k)} onChange={() => toggle(k)} />
              <span className="role-chip" style={{ background: v.color + "1e", color: v.color }}>{v.short}</span>{v.label}
            </label>
            {k === "kb_chief" && roles.includes("kb_chief") && (
              <div className="sub-picks">{db.kbs.map((kb) => <label key={kb.id} className="dept-pick"><input type="checkbox" checked={kbIds.includes(kb.id)} onChange={() => setKbIds((s) => s.includes(kb.id) ? s.filter((x) => x !== kb.id) : [...s, kb.id])} />{kb.name}</label>)}</div>
            )}
            {k === "head" && roles.includes("head") && (
              <div className="sub-picks">{db.departments.map((d) => <label key={d.id} className="dept-pick"><input type="checkbox" checked={headDeptIds.includes(d.id)} onChange={() => setHeadDeptIds((s) => s.includes(d.id) ? s.filter((x) => x !== d.id) : [...s, d.id])} />{d.name}{d.kbId ? ` (${db.kbs.find((x) => x.id === d.kbId)?.name})` : ""}</label>)}</div>
            )}
          </div>
        ))}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить роли</button>
      </div>
    </Modal>
  );
};