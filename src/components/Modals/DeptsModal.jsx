// src/components/Modals/DeptsModal.jsx
import { useState, useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';

export const DeptsModal = ({ store, empId, onClose, toast }) => {
  const db = store.data;
  const emp = db.employees.find(e => e.id === empId);
  if (!emp) return null;

  const [selections, setSelections] = useState(emp.departments.map(d => ({ ...d })));

  const toggleDept = (deptId) => {
    setSelections(prev => {
      const exists = prev.some(x => x.deptId === deptId);
      if (exists) {
        const filtered = prev.filter(x => x.deptId !== deptId);
        if (filtered.length && !filtered.some(x => x.primary)) {
          filtered[0].primary = true;
        }
        return filtered;
      }
      return [...prev, { deptId, primary: prev.length === 0, position: '' }];
    });
  };

  const setPrimary = (deptId) => {
    setSelections(prev => prev.map(x => ({ ...x, primary: x.deptId === deptId })));
  };

  const setPosition = (deptId, pos) => {
    setSelections(prev => prev.map(x => x.deptId === deptId ? { ...x, position: pos } : x));
  };

  const saveAsync = useCallback(async () => {
    if (!selections.length) throw new Error('Выберите хотя бы одно подразделение');
    if (!selections.some(x => x.primary)) throw new Error('Укажите основное подразделение');

    const updatedEmp = {
      ...emp,
      departments: selections.map(({ deptId, primary, position }) => ({
        deptId,
        primary,
        position: position?.trim() || ''
      }))
    };
    await store.upsertEmployee(updatedEmp);
    store.addAudit('Изменение подразделений сотрудника', `${emp.last} ${emp.first}`);
    onClose();
  }, [selections, emp, store, onClose]);

  const { submit: save, isSubmitting } = useAsyncSubmit(saveAsync, (error) => {
    toast(error.message || 'Ошибка сохранения подразделений', 'error');
  });

  return (
    <ModalShell
      title={`Подразделения — ${emp.last} ${emp.first}`}
      onClose={onClose}
      onSave={save}
      width={560}
      saveDisabled={isSubmitting}
    >
      <p className="mut sm">Сотрудник может числиться в нескольких отделах. Отметьте основное подразделение. Для дополнительных (совмещаемых) отделов вы можете указать отдельную должность.</p>
      <div className="roles-list">
        {db.departments.map(d => {
          const cur = selections.find(x => x.deptId === d.id);
          const kb = db.kbs.find(k => k.id === d.kbId);
          const isPrimary = cur && cur.primary;
          const isExtra = cur && !cur.primary;
          return (
            <div key={d.id} className="mb-8">
              <label className="roles-item roles-item-clean">
                <input type="checkbox" checked={!!cur} onChange={() => toggleDept(d.id)} />
                <span style={{ flex: 1 }}>{d.name} <span className="mut sm">{kb ? `· ${kb.name}` : '· вне КБ'}</span></span>
                {cur && (
                  <button className={'btn ghost sm' + (isPrimary ? ' prim-btn' : '')} onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}>
                    {isPrimary ? 'основное ✓' : 'сделать основным'}
                  </button>
                )}
              </label>
              {isExtra && (
                <div className="extra-position-field">
                  <label className="lbl" style={{ margin: 0, fontSize: 12 }}>Должность в этом отделе (дополнительная):</label>
                  <input className="inp extra-position-input" value={cur.position || ''} onChange={(e) => setPosition(d.id, e.target.value)} placeholder="Например: Ведущий инженер (совмещение)" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};