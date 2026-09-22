// src/components/Projects.jsx
import { useMemo } from 'react';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_PRIORITIES } from '../utils/constants';
import { fmtDMY, initials } from '../utils/date';
import { isTaskActive } from '../utils/entityState';
import { Ic, ICONS } from './Icons';
import { getProjectColor } from '../utils/projectHelpers';
import ProjectProgress from './ProjectProgress';
import FloatingMenu from './FloatingMenu';
import { buildProjectMenu } from './menus';
import { chatKey } from '../utils/chatKey';
import { UnreadBadge } from './UnreadBadge';

/**
 * Список карточек проектов.
 *
 * onMoveProject - единый колбэк смены статуса. Раньше здесь были
 * отдельные onCloseProject / onCancelProject, а active ↔ inactive
 * вообще не переключался через меню (только drag в канбане). Теперь
 * весь блок «Перевести в статус» вызывает onMoveProject, а
 * подтверждение для закрывающих статусов - забота самого колбэка
 * (ProjectsView.handleMoveProject).
 *
 * Статистика по задачам (plan/fact) и справочник сотрудников
 * предвычислены один раз до .map() по проектам. Раньше внутри .map()
 * шло db.tasks.filter(...) на каждый проект и db.employees.find(...)
 * на каждую задачу - при 20 проектах и 200 задачах это давало
 * ~4000 итераций на каждый рендер списка. Паттерн симметричен
 * ProjectsView.projectStatsById.
 */
export default function Projects({
  db,
  ur,
  openProject,
  projects,
  unreadIndex,
  onMoveProject,
  openCopyProject,
  openTemplateFromProject,
  openProjectAccess,
}) {
  const employeesById = useMemo(
    () => new Map(db.employees.map(e => [e.id, e])),
    [db.employees],
  );

  /**
   * Статистика по проектам одним проходом по задачам.
   *
   * Возвращает Map<projectId, { plan, fact, activeTasks }>.
   * activeTasks - список активных задач проекта: он нужен для отрисовки
   * аватаров исполнителей на карточке. Храним его здесь же, а не
   * фильтруем повторно в .map() по проектам.
   *
   * isTaskActive фильтрует архив и завершённые: тот же предикат, что в
   * ProjectsView - цифры на карточке и в статистике совпадают.
   */
  const projectStatsById = useMemo(() => {
    const map = new Map();
    const byProject = new Map();
    for (const t of db.tasks) {
      if (!isTaskActive(t)) continue;
      let list = byProject.get(t.projectId);
      if (!list) { list = []; byProject.set(t.projectId, list); }
      list.push(t);
    }
    byProject.forEach((list, projectId) => {
      let plan = 0;
      let fact = 0;
      for (const t of list) {
        plan += t.plannedHours || 0;
        if (Array.isArray(t.logs)) {
          for (const l of t.logs) fact += l.hours || 0;
        }
      }
      map.set(projectId, { plan, fact, activeTasks: list });
    });
    return map;
  }, [db.tasks]);

  return (
    <div>
      <div className="pj-grid">
        {projects.map(p => {
          const stats = projectStatsById.get(p.id) || { plan: 0, fact: 0, activeTasks: [] };
          const projectColor = getProjectColor(p);
          const unread = unreadIndex.get(chatKey({ projectId: p.id })) || 0;

          const menuItems = buildProjectMenu({
            project: p,
            user: ur,
            openProject,
            onMove: onMoveProject,
            onCopy: openCopyProject,
            onMakeTemplate: openTemplateFromProject,
            onOpenAccess: openProjectAccess,
          });

          return (
            <FloatingMenu key={p.id} items={menuItems}>
              {({ anchorProps, buttonProps }) => (
                <div
                  {...anchorProps}
                  className="pj-card cursor-pointer relative"
                  onClick={() => openProject(p.id)}
                >
                  <button
                    {...buttonProps}
                    className="icon-btn kcard-menu-btn"
                    title="Действия"
                    aria-label={`Действия с проектом ${p.name}`}
                  >
                    <Ic d={ICONS.more} size={15} />
                  </button>

                  <div className="pj-top">
                    <span className="pj-code" style={{ background: projectColor + '22', color: projectColor }}>
                      {p.code}
                    </span>
                    <span className={`pj-st ${p.status}`}>{PROJECT_STATUSES[p.status]}</span>
                    <span className="text-xs text-mut">{PROJECT_TYPES[p.ptype || 'prod']}</span>
                    <span className="pj-priority font-semibold" style={{ color: PROJECT_PRIORITIES[p.priority]?.color || '#64748b' }}>
                      {p.priority || 'NORM'}
                    </span>
                  </div>
                  <div className="pj-name">{p.name}</div>
                  <div className="pj-row">
                    <span className="mut">Сроки:</span> {fmtDMY(p.start)} - {p.end ? fmtDMY(p.end) : 'не задан'}
                  </div>
                  <ProjectProgress project={p} plan={stats.plan} fact={stats.fact} />
                  <div className="pj-foot">
                    <div className="pj-avatars">
                      {stats.activeTasks.map(t => {
                        const a = t.assigneeId ? employeesById.get(t.assigneeId) : null;
                        return a && (
                          <span key={t.id} className="avatar xs" title={`${a.last} ${a.first}`}>
                            {initials(a.first, a.last)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <UnreadBadge
                    count={unread}
                    onClick={() => openProject(p.id, 'chat')}
                  />
                </div>
              )}
            </FloatingMenu>
          );
        })}
      </div>
    </div>
  );
}