import React, { useState } from 'react';
import { Modal } from '../Modal';

export const DeptsModal = ({ db, store, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [sel, setSel] = useState(emp.departments.map(d => ({ ...d, rate: d.rate || 1 })));
  
  const toggle = (deptId) => {
    setSel((s) => {
      if (s.some((x) => x.deptId === deptId)) {
        const next = s.filter((x) => x.deptId !== deptId);
        return next.length && !next.some((x) => x.primary) ? next.map((x, i) => ({ ...x, primary: i === 0 })) : next;
      }
      return [...s, { deptId, primary: s.length === 0, rate: 1 }];
    });
  };
  
  const setPrimary = (deptId) => setSel((s) => s.map((x) => ({ ...x, primary: x.deptId === deptId })));
  
  const updateRate = (deptId, newRate) => {
    setSel((s) => s.map((x) => x.deptId === deptId ? { ...x, rate: parseFloat(newRate) || 1 } : x));
  };
  
  const save = () => {
    if (!sel.length) return toast.error?.("Выберите хотя бы одно подразделение") || alert("Выберите хотя бы одно подразделение");
    if (!sel.some((x) => x.primary)) return toast.error?.("Укажите основное подразделение") || alert("Укажите основное подразделение");
    const before = emp.departments.map((x) => `${x.deptId}${x.rate ? `(${x.rate})` : ''}`).join(",");
    const updatedEmp = { ...emp, departments: sel };
    store.updateEmployee(updatedEmp);
    audit("Изменение подразделений сотрудника", `${emp.last} ${emp.first}: [${before}] → [${sel.map((x) => `${x.deptId}${x.rate ? `(${x.rate})` : ''}`).join(",")}]`);
    toast.success?.("Подразделения обновлены") || alert("Подразделения обновлены");
    onClose();
  };
  
  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">Сотрудник может числиться в нескольких отделах (в том числе разных КБ). Отметьте основное подразделение и укажите ставку для каждого.</p>
      <div className="roles-list">
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          return (
            <div key={d.id} className="roles-item" style={{ alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} />
              <span style={{ flex: 1 }}>{d.name} <span className="mut sm">{kb ? `· ${kb.name}` : "· вне КБ"}</span></span>
              {cur && (
                <>
                  <input
                    type="number"
                    className="no-spinner rate-input"
                    step="0.1"
                    min="0.1"
                    max="1"
                    value={cur.rate || 1}
                    onChange={(e) => updateRate(d.id, e.target.value)}
                    style={{ width: '60px' }}
                    title="Ставка (доля)"
                  />
                  <button className={"btn ghost sm" + (cur.primary ? " prim-btn" : "")} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>{cur.primary ? "основное ✓" : "сделать основным"}</button>
                </>
              )}
            </div>
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