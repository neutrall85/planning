import React, { useState } from 'react';
import { Modal } from '../Modal';

export const DeptsModal = ({ db, store, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [sel, setSel] = useState(emp.departments.map(d => ({ ...d, rate: d.rate || 1, position: d.position || '' })));
  
  const toggle = (deptId) => {
    setSel((s) => {
      if (s.some((x) => x.deptId === deptId)) {
        const next = s.filter((x) => x.deptId !== deptId);
        return next.length && !next.some((x) => x.primary) ? next.map((x, i) => ({ ...x, primary: i === 0 })) : next;
      }
      return [...s, { deptId, primary: s.length === 0, rate: 1, position: emp.position || '' }];
    });
  };
  
  const setPrimary = (deptId) => setSel((s) => s.map((x) => ({ ...x, primary: x.deptId === deptId })));
  
  const updateRate = (deptId, newRate) => {
    let val = parseFloat(newRate);
    if (isNaN(val) || val < 0.1) val = 0.1;
    if (val > 1) val = 1;
    setSel((s) => s.map((x) => x.deptId === deptId ? { ...x, rate: val } : x));
  };
  
  const updatePosition = (deptId, newPos) => {
    setSel((s) => s.map((x) => x.deptId === deptId ? { ...x, position: newPos } : x));
  };
  
  const save = () => {
    // Проверка основного подразделения только если есть выбранные отделы
    if (sel.length > 0 && !sel.some((x) => x.primary)) {
      if (toast && typeof toast.error === 'function') {
        toast.error("Укажите основное подразделение");
      } else {
        alert("Укажите основное подразделение");
      }
      return;
    }
    
    const before = emp.departments.map((x) => `${x.deptId}${x.rate ? `(${x.rate})` : ''}`).join(",");
    
    // Формируем данные для отправки на бэкенд
    const payload = {
      employeeId: empId,
      departments: sel.map(x => ({
        departmentId: x.deptId,
        rate: x.rate,
        position: x.position,
        isMain: x.primary
      }))
    };
    
    const updatedEmp = { ...emp, departments: sel };
    store.updateEmployee(updatedEmp);
    audit("Изменение подразделений сотрудника", `${emp.last} ${emp.first}: [${before}] → [${sel.map((x) => `${x.deptId}${x.rate ? `(${x.rate})` : ''}`).join(",")}]`);
    
    if (toast && typeof toast.success === 'function') {
      toast.success("Подразделения обновлены");
    } else {
      alert("Подразделения обновлены");
    }
    onClose();
  };
  
  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">Сотрудник может числиться в нескольких отделах (в том числе разных КБ). Отметьте основное подразделение, укажите ставку (0.1–1) и должность для каждого.</p>
      <div className="roles-list">
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          return (
            <div key={d.id} className="roles-item" style={{ alignItems: 'flex-start', gap: '8px', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} style={{ marginTop: '0' }} />
                <span style={{ flex: 1 }}>{d.name} <span className="mut sm">{kb ? `· ${kb.name}` : "· вне КБ"}</span></span>
                {cur && (
                  <button className={"btn ghost sm" + (cur.primary ? " prim-btn" : "")} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>{cur.primary ? "основное ✓" : "сделать основным"}</button>
                )}
              </div>
              {cur && (
                <div style={{ display: 'flex', gap: '8px', marginLeft: '24px', width: 'calc(100% - 24px)', marginTop: '8px' }}>
                  <input
                    type="number"
                    className="no-spinner rate-input"
                    step="0.1"
                    min="0.1"
                    max="1"
                    value={cur.rate || 1}
                    onChange={(e) => updateRate(d.id, e.target.value)}
                    style={{ width: '80px' }}
                    title="Ставка (доля)"
                    placeholder="Ставка"
                  />
                  <input
                    type="text"
                    className="no-spinner"
                    value={cur.position || ''}
                    onChange={(e) => updatePosition(d.id, e.target.value)}
                    style={{ flex: 1, minWidth: '150px' }}
                    title="Должность в этом отделе"
                    placeholder="Должность в отделе"
                  />
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