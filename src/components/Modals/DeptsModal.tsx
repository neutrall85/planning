import { useState } from 'react';
import { Modal } from '../Modal';

export const DeptsModal = ({ db, store, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [sel, setSel] = useState(emp.departments.map(d => ({ ...d, primary: d.primary, position: d.position || '' })));
  
  const toggle = (deptId) => {
    setSel((s) => {
      if (s.some((x) => x.deptId === deptId)) {
        const next = s.filter((x) => x.deptId !== deptId);
        return next.length && !next.some((x) => x.primary) ? next.map((x, i) => ({ ...x, primary: i === 0 })) : next;
      }
      return [...s, { deptId, primary: s.length === 0, position: '' }];
    });
  };
  
  const setPrimary = (deptId) => setSel((s) => s.map((x) => ({ ...x, primary: x.deptId === deptId })));
  
  const updatePosition = (deptId, position) => {
    setSel((s) => s.map((x) => x.deptId === deptId ? { ...x, position } : x));
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
    
    // Функция для получения названия подразделения по ID
    const getDeptName = (deptId) => {
      const dept = db.departments.find(d => d.id === deptId);
      return dept ? dept.name : deptId;
    };
    
    // Формируем читаемые списки подразделений
    const beforeList = emp.departments.map(x => getDeptName(x.deptId)).join(', ');
    const afterList = sel.map(x => getDeptName(x.deptId)).join(', ');
    
    const updatedEmp = { ...emp, departments: sel };
    store.updateEmployee(updatedEmp);
    audit("Изменение подразделений", `${emp.last} ${emp.first}: ${beforeList || '–'} → ${afterList || '–'}`);
    
    if (toast && typeof toast.success === 'function') {
      toast.success("Подразделения обновлены");
    } else {
      alert("Подразделения обновлены");
    }
    onClose();
  };
  
  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={520}>
      <p className="mut sm">Сотрудник может числиться в нескольких отделах (в том числе разных КБ). Отметьте основное подразделение и укажите должность для каждого отдела.</p>
      <div className="roles-list">
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          return (
            <div key={d.id} className="roles-item" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} style={{ marginTop: '0' }} />
                <span style={{ flex: 1 }}>{d.name} <span className="mut sm">{kb ? `· ${kb.name}` : "· вне КБ"}</span></span>
                {cur && (
                  <button className={"btn ghost sm" + (cur.primary ? " prim-btn" : "")} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>{cur.primary ? "основное ✓" : "сделать основным"}</button>
                )}
              </div>
              {cur && (
                <input
                  type="text"
                  placeholder="Должность в этом отделе"
                  value={cur.position || ''}
                  onChange={(e) => updatePosition(d.id, e.target.value)}
                  style={{ marginLeft: '24px', width: 'calc(100% - 24px)', padding: '6px 8px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '13px' }}
                />
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