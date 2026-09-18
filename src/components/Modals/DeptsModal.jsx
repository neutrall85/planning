// src/components/Modals/DeptsModal.jsx
import { useState, useCallback, useMemo } from 'react';
import { ModalShell } from '../ModalShell';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';

/**
 * Редактор подразделений сотрудника.
 *
 * Обычный сотрудник: одно подразделение помечается основным (primary),
 * остальные - совмещения.
 *
 * Главный конструктор (kb_chief): его основное место работы - КБ, а не
 * отдел. Поэтому в этой модалке он в принципе не может иметь основного
 * отдела: все выбранные подразделения - совмещения (primary: false),
 * кнопка «сделать основным» не показывается, проверка «Укажите основное
 * подразделение» не применяется. Это согласовано с правилами
 * отображения в utils/helpers (getPositionInDept / buildEmployeePositions):
 * у ГК любая запись в departments трактуется как совмещение.
 */
export const DeptsModal = ({ store, empId, onClose, toast }) => {
  const db = store.data;
  const emp = db.employees.find(e => e.id === empId);

  const isKbChief = useMemo(
    () => !!emp && Array.isArray(emp.roles) && emp.roles.includes('kb_chief'),
    [emp],
  );

  // Начальные selections. Для ГК - на всякий случай нормализуем primary
  // в false: если в данных остался флаг от старой версии, интерфейс не
  // должен показывать «основное», которого по правилу быть не может.
  const [selections, setSelections] = useState(() => {
    if (!emp) return [];
    return emp.departments.map(d =>
      isKbChief ? { ...d, primary: false } : { ...d },
    );
  });

  const toggleDept = (deptId) => {
    setSelections(prev => {
      const exists = prev.some(x => x.deptId === deptId);
      if (exists) {
        const filtered = prev.filter(x => x.deptId !== deptId);
        // Обычный сотрудник: если сняли основной - первой оставшейся
        // записи возвращаем primary, чтобы не остаться без основного.
        // Для ГК правило не применяется: primary всегда false.
        if (!isKbChief && filtered.length && !filtered.some(x => x.primary)) {
          filtered[0].primary = true;
        }
        return filtered;
      }
      return [
        ...prev,
        { deptId, primary: false, position: '' },
      ];
    });
  };

  const setPrimary = (deptId) => {
    if (isKbChief) return;
    setSelections(prev => prev.map(x => ({ ...x, primary: x.deptId === deptId })));
  };

  const setPosition = (deptId, pos) => {
    setSelections(prev => prev.map(x => x.deptId === deptId ? { ...x, position: pos } : x));
  };

  const saveAsync = useCallback(async () => {
    if (!emp) throw new Error('Сотрудник не найден');
    if (!selections.length) {
      // У ГК тоже требуем хотя бы одно подразделение: если у него нет
      // КБ в kbIds и нет отделов - он «нигде», это ошибка данных.
      throw new Error('Выберите хотя бы одно подразделение');
    }
    if (!isKbChief && !selections.some(x => x.primary)) {
      throw new Error('Укажите основное подразделение');
    }

    const updatedEmp = {
      ...emp,
      departments: selections.map(({ deptId, position }) => ({
        deptId,
        // У ГК основное - КБ; в departments primary всегда false.
        primary: isKbChief ? false : !!selections.find(s => s.deptId === deptId)?.primary,
        position: position?.trim() || '',
      })),
    };
    await store.upsertEmployee(updatedEmp);
    onClose();
  }, [selections, emp, isKbChief, store, onClose]);

  const { submit: save, isSubmitting } = useAsyncSubmit(saveAsync, (error) => {
    toast(error.message || 'Ошибка сохранения подразделений', 'error');
  });

  if (!emp) return null;

  return (
    <ModalShell
      title={`Подразделения - ${emp.last} ${emp.first}`}
      onClose={onClose}
      onSave={save}
      width={560}
      saveDisabled={isSubmitting}
    >
      {isKbChief ? (
        <p className="mut sm">
          Сотрудник - главный конструктор. Его основное место работы - КБ,
          поэтому все выбранные ниже отделы считаются совмещениями.
          Для каждого совмещаемого отдела можно указать отдельную должность.
        </p>
      ) : (
        <p className="mut sm">
          Сотрудник может числиться в нескольких отделах. Отметьте основное
          подразделение. Для дополнительных (совмещаемых) отделов вы можете
          указать отдельную должность.
        </p>
      )}

      <div className="roles-list">
        {db.departments.map(d => {
          const cur = selections.find(x => x.deptId === d.id);
          const kb = db.kbs.find(k => k.id === d.kbId);
          const isPrimary = !isKbChief && cur && cur.primary;
          const isExtra = cur && !isPrimary;
          return (
            <div key={d.id} className="mb-8">
              <label className="roles-item roles-item-clean">
                <input type="checkbox" checked={!!cur} onChange={() => toggleDept(d.id)} />
                <span style={{ flex: 1 }}>
                  {d.name}{' '}
                  <span className="mut sm">
                    {kb ? `· ${kb.name}` : '· вне КБ'}
                  </span>
                </span>
                {!isKbChief && cur && (
                  <button
                    type="button"
                    className={'btn ghost sm' + (isPrimary ? ' prim-btn' : '')}
                    onClick={(e) => { e.preventDefault(); setPrimary(d.id); }}
                  >
                    {isPrimary ? 'основное ✓' : 'сделать основным'}
                  </button>
                )}
              </label>
              {isExtra && (
                <div className="extra-position-field">
                  <label className="lbl" style={{ margin: 0, fontSize: 12 }}>
                    Должность в этом отделе (дополнительная):
                  </label>
                  <input
                    className="inp extra-position-input"
                    value={cur.position || ''}
                    onChange={(e) => setPosition(d.id, e.target.value)}
                    placeholder="Например: Ведущий инженер (совмещение)"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};