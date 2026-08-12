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
    if (!sel.length) return toast("Выберите хотя бы одно подразделение", "err");
    if (!sel.some((x) => x.primary)) return toast("Укажите основное подразделение", "err");
    const before = emp.departments.map((x) => `${x.deptId}${x.rate ? `(${x.rate})` : ''}`).join(",");
    const updatedEmp = { ...emp, departments: sel };
    store.updateEmployee(updatedEmp);
    audit("Изменение подразделений сотрудника", `${emp.last} ${emp.first}: [${before}] → [${sel.map((x) => `${x.deptId}${x.rate ? `(${x.rate})` : ''}`).join(",")}]`);
    toast("Подразделения обновлены");
    onClose();
  };
  
  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={560}>
      <p className="mut sm">Сотрудник может числиться в нескольких отделах (в том числе разных КБ). Отметьте основное подразделение и укажите ставку для каждого.</p>
      <div className="roles-list" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          return (
            <div key={d.id} className="roles-item" style={{ alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '6px', background: cur ? '#f8fafc' : 'transparent', border: cur ? '1px solid #e2e8f0' : '1px solid transparent' }}>
              <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} style={{ cursor: 'pointer' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontWeight: cur ? 500 : 400 }}>{d.name}</span>
                {kb && <span className="mut sm" style={{ fontSize: '11px' }}>{kb.name}</span>}
              </div>
              {cur && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <label style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>Ставка</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="1"
                      value={cur.rate || 1}
                      onChange={(e) => updateRate(d.id, e.target.value)}
                      style={{ width: '56px', padding: '5px 6px', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 500 }}
                    />
                  </div>
                  <button 
                    className={"btn ghost sm" + (cur.primary ? " prim-btn" : "")} 
                    onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}
                    style={{ fontSize: '11px', padding: '4px 8px', minHeight: '28px' }}
                  >
                    {cur.primary ? "основное ✓" : "сделать основным"}
                  </button>
                </div>
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