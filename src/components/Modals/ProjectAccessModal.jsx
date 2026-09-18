// src/components/Modals/ProjectAccessModal.jsx
import { useCallback, useMemo, useState } from 'react';
import { ModalShell } from '../ModalShell';
import Avatar from '../Avatar';
import { SearchBox } from '../SearchBox';
import { canSeeProjectByDefault } from '../../utils/permissions';
import { useNestedModalEscape } from '../Templates/useNestedModalEscape';

/**
 * Окно управления персональным доступом к проекту.
 *
 * Сотрудники, которые видят проект по своим ролям, задачам или КБ
 * (canSeeProjectByDefault), отмечены и защищены от снятия: это «доступ
 * по роли», он управляется ролями сотрудника, а не этим окном. Остальные
 * сотрудники - обычные чекбоксы, чьё состояние хранится в
 * project.access.userIds.
 *
 * Модалка не дублирует логику прав: всё, что нужно для разграничения
 * «locked / editable», берётся из canSeeProjectByDefault. Запись идёт
 * через store.setProjectAccess - сервис сам проверит право на запись
 * тем же предикатом, что использовался для показа кнопки «Доступ».
 */
export const ProjectAccessModal = ({ db, projectId, onClose, toast, store }) => {
  useNestedModalEscape(onClose);

  const project = db.projects.find(p => p.id === projectId);

  const [userIds, setUserIds] = useState(() => {
    const initial = project?.access?.userIds;
    return Array.isArray(initial) ? [...initial] : [];
  });
  const [query, setQuery] = useState('');

  const activeEmployees = useMemo(
    () => db.employees.filter(e => !e.fired),
    [db.employees]
  );

  // Один проход по сотрудникам - определяем, у кого доступ уже есть
  // по роли/КБ/задачам. Дальше в рендере - только проверка по Set.
  const lockedIds = useMemo(() => {
    if (!project) return new Set();
    const set = new Set();
    for (const emp of activeEmployees) {
      if (canSeeProjectByDefault(emp, project, db)) set.add(emp.id);
    }
    return set;
  }, [activeEmployees, project, db]);

  // Поиск по ФИО и должности. Фильтруем только для отображения -
  // lockedIds и userIds остаются полными: снятие галочки с найденного
  // сотрудника невозможно, а состояние ненайденных не теряется.
  const visibleEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeEmployees;
    return activeEmployees.filter(emp =>
      `${emp.last} ${emp.first}`.toLowerCase().includes(q) ||
      (emp.position || '').toLowerCase().includes(q)
    );
  }, [activeEmployees, query]);

  const toggleUser = useCallback((id) => {
    setUserIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }, []);

  const save = useCallback(() => {
    try {
      store.setProjectAccess(projectId, { userIds });
      toast('Доступ к проекту обновлён', 'success');
      onClose();
    } catch (error) {
      toast(error.message || 'Не удалось обновить доступ', 'error');
    }
  }, [projectId, userIds, store, toast, onClose]);

  if (!project) return null;

  return (
    <ModalShell
      title={`Доступ к проекту: ${project.name}`}
      onClose={onClose}
      onSave={save}
      saveLabel="Сохранить"
      width={560}
      className="modal-access"
    >
      <div className="access-section">
        <div className="access-section-head">
          <span className="access-section-title">Сотрудники</span>
          <span className="access-section-count">{userIds.length} с явным доступом</span>
        </div>

        <SearchBox
          value={query}
          onChange={setQuery}
          placeholder="Поиск по ФИО или должности…"
          className="access-search"
        />

        <div className="access-list">
          {visibleEmployees.length === 0 ? (
            <div className="access-empty">Ничего не найдено</div>
          ) : (
            visibleEmployees.map(emp => {
              const locked = lockedIds.has(emp.id);
              const checked = locked || userIds.includes(emp.id);
              return (
                <label key={emp.id} className="access-item">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={locked}
                    onChange={() => toggleUser(emp.id)}
                  />
                  <Avatar employee={emp} size="xs" />
                  <span className="access-item-name">{emp.last} {emp.first}</span>
                  <span className="access-item-note">
                    {locked ? 'доступ по роли' : emp.position}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </ModalShell>
  );
};