import React, { useState } from 'react';
import { Modal } from '../Modal';

export const DeptsModal = ({ db, setDb, empId, onClose, toast, audit }) => {
  const emp = db.employees.find((e) => e.id === empId);
  const [sel, setSel] = useState(emp.departments.map(d => ({ ...d })));

  const toggle = (deptId) => {
    setSel((s) => {
      if (s.some((x) => x.deptId === deptId)) {
        const next = s.filter((x) => x.deptId !== deptId);
        // если после удаления не осталось primary, делаем первый primary
        if (next.length && !next.some((x) => x.primary)) {
          next[0].primary = true;
        }
        return next;
      }
      // добавляем новый отдел как неосновной (primary: false)
      return [...s, { deptId, primary: s.length === 0, position: '' }];
    });
  };

  const setPrimary = (deptId) => {
    setSel((s) => s.map((x) => ({ ...x, primary: x.deptId === deptId })));
  };

  const setPosition = (deptId, pos) => {
    setSel((s) => s.map((x) => (x.deptId === deptId ? { ...x, position: pos } : x)));
  };

  const save = () => {
    if (!sel.length) return toast("Выберите хотя бы одно подразделение", "err");
    if (!sel.some((x) => x.primary)) return toast("Укажите основное подразделение", "err");
    // Обновляем сотрудника
    const before = emp.departments.map((x) => `${x.deptId}:${x.position || ''}`).join(',');
    const after = sel.map((x) => `${x.deptId}:${x.position || ''}`).join(',');
    setDb((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === empId
          ? { ...e, departments: sel.map(({ deptId, primary, position }) => ({ deptId, primary, position: position?.trim() || '' })) }
          : e
      ),
    }));
    audit("Изменение подразделений сотрудника", `${emp.last} ${emp.first}: [${before}] → [${after}]`);
    toast("Подразделения обновлены");
    onClose();
  };

  return (
    <Modal title={`Подразделения — ${emp.last} ${emp.first}`} onClose={onClose} width={560}>
      <p className="mut sm">
        Сотрудник может числиться в нескольких отделах. Отметьте основное подразделение. 
        <strong> Для дополнительных (совмещаемых) отделов вы можете указать отдельную должность.</strong>
      </p>
      <div className="roles-list">
        {db.departments.map((d) => {
          const cur = sel.find((x) => x.deptId === d.id);
          const kb = db.kbs.find((k) => k.id === d.kbId);
          const isPrimary = cur && cur.primary;
          const isExtra = cur && !cur.primary;
          return (
            <div key={d.id} style={{ marginBottom: 8 }}>
              <label className="roles-item" style={{ border: 'none', padding: 0 }}>
                <input type="checkbox" checked={!!cur} onChange={() => toggle(d.id)} />
                <span style={{ flex: 1 }}>
                  {d.name} <span className="mut sm">{kb ? `· ${kb.name}` : "· вне КБ"}</span>
                </span>
                {cur && (
                  <button className={"btn ghost sm" + (isPrimary ? " prim-btn" : "")} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>
                    {isPrimary ? "основное ✓" : "сделать основным"}
                  </button>
                )}
              </label>
              {/* Поле для дополнительной должности показываем только для НЕосновных отделов */}
              {isExtra && (
                <div style={{ marginLeft: 28, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="lbl" style={{ margin: 0, fontSize: 12 }}>Должность в этом отделе (дополнительная):</label>
                  <input
                    className="inp"
                    style={{ flex: 1, padding: '6px 10px', fontSize: 14 }}
                    value={cur.position || ''}
                    onChange={(e) => setPosition(d.id, e.target.value)}
                    placeholder="Например: Ведущий инженер (совмещение)"
                  />
                </div>
              )}
              {/* Для основного отдела не показываем поле — должность редактируется в карточке сотрудника */}
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