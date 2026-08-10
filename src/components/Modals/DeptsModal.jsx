import React, { useState } from 'react';
import { Modal } from '../Modal';

export const DeptsModal = ({ db, store, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [sel, setSel] = useState(emp.departments);
  const toggle = (deptId) => {
    setSel((s) => {
      if (s.some((x) => x.deptId === deptId)) {
        const next = s.filter((x) => x.deptId !== deptId);
        return next.length && !next.some((x) => x.primary) ? next.map((x, i) => ({ ...x, primary: i === 0 })) : next;
      }
      return [...s, { deptId, primary: s.length === 0 }];
    });
  };
  const setPrimary = (deptId) => setSel((s) => s.map((x) => ({ ...x, primary: x.deptId === deptId })));
  const save = () => {
    if (!sel.length) return toast("Выберите хотя бы одно подразделение", "err");
    if (!sel.some((x) => x.primary)) return toast("Укажите основное подразделение", "err");
    const before = emp.departments.map((x) => x.deptId).join(",");
    const updatedEmp = { ...emp, departments: sel };
    store.updateEmployee(updatedEmp);
    audit("Изменение подразделений сотрудника", `${emp.last} ${emp.first}: [${before}] → [${sel.map((x) => x.deptId).join(",")}]`);
    toast("Подразделения обновлены");
    onClose();
  };
  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">Сотрудник может числиться в нескольких отделах (в том числе разных КБ). Отметьте основное подразделение.</p>
      <div className="roles-list">
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          return (
            <label key={d.id} className="roles-item">
              <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} />
              <span style={{ flex: 1 }}>{d.name} <span className="mut sm">{kb ? `· ${kb.name}` : "· вне КБ"}</span></span>
              {cur && <button className={"btn ghost sm" + (cur.primary ? " prim-btn" : "")} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>{cur.primary ? "основное ✓" : "сделать основным"}</button>}
            </label>
          );
        })}
      </div>
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Отмена</button>
        <button className="btn primary" onClick={save}>Сохранить</button>
      </div>
    </Modal>
  );
};