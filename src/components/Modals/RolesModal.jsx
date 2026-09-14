// src/components/Modals/RolesModal.jsx
import { useState, useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { ROLES } from '../../utils/constants';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';

export const RolesModal = ({ store, empId, onClose, toast }) => {
  const db = store.data;
  const emp = db.employees.find(e => e.id === empId);
  if (!emp) return null;

  const [roles, setRoles] = useState(emp.roles || []);
  const [kbIds, setKbIds] = useState(emp.kbIds || []);
  const [headDeptIds, setHeadDeptIds] = useState(emp.headDeptIds || []);

  const toggleRole = (role) => {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
  };

  const toggleKb = (kbId) => {
    setKbIds(prev => prev.includes(kbId) ? prev.filter(id => id !== kbId) : [...prev, kbId]);
  };

  const toggleDept = (deptId) => {
    setHeadDeptIds(prev => prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]);
  };

  const saveAsync = useCallback(async () => {
    if (roles.includes('kb_chief') && kbIds.length === 0) {
      throw new Error('Для роли "Главный конструктор" необходимо выбрать хотя бы одно КБ');
    }
    if (roles.includes('head') && headDeptIds.length === 0) {
      throw new Error('Для роли "Руководитель отдела" необходимо выбрать хотя бы один отдел');
    }

    let updatedDepartments = emp.departments;
    if (roles.includes('kb_chief')) {
      updatedDepartments = [];
    }

    const updatedEmp = {
      ...emp,
      roles,
      kbIds: roles.includes('kb_chief') ? kbIds : [],
      headDeptIds: roles.includes('head') ? headDeptIds : [],
      departments: updatedDepartments,
    };
    await store.upsertEmployee(updatedEmp);
    store.addAudit('Назначение ролей', `${emp.last} ${emp.first}: ${roles.map(r => ROLES[r]?.short || r).join(', ')}`);
    onClose();
  }, [emp, roles, kbIds, headDeptIds, store, onClose]);

  const { submit: save, isSubmitting } = useAsyncSubmit(saveAsync, (error) => {
    toast(error.message || 'Ошибка сохранения ролей', 'error');
  });

  return (
    <ModalShell
      title={`Роли — ${emp.last} ${emp.first}`}
      onClose={onClose}
      onSave={save}
      width={520}
      className="modal-roles"
      saveDisabled={isSubmitting}
    >
      <p className="mut sm">Сотрудник может иметь несколько ролей. Для «Главного конструктора» укажите КБ, для «Руководителя отдела» — перечень отделов.</p>
      <div className="roles-list">
        {Object.entries(ROLES).map(([k, v]) => (
          <div key={k}>
            <label className="roles-item">
              <input type="checkbox" checked={roles.includes(k)} onChange={() => toggleRole(k)} />
              <span className="role-chip" style={{ background: v.color + '1e', color: v.color }}>{v.short}</span>
              {v.label}
            </label>
            {k === 'kb_chief' && roles.includes('kb_chief') && (
              <div className="sub-picks">
                {db.kbs.map(kb => (
                  <label key={kb.id} className="dept-pick">
                    <input type="checkbox" checked={kbIds.includes(kb.id)} onChange={() => toggleKb(kb.id)} />
                    {kb.name}
                  </label>
                ))}
              </div>
            )}
            {k === 'head' && roles.includes('head') && (
              <div className="sub-picks">
                {db.departments.map(d => (
                  <label key={d.id} className="dept-pick">
                    <input type="checkbox" checked={headDeptIds.includes(d.id)} onChange={() => toggleDept(d.id)} />
                    {d.name} {d.kbId ? `(${db.kbs.find(x => x.id === d.kbId)?.name})` : ''}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ModalShell>
  );
};