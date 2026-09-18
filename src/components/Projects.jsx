// src/components/Projects.jsx
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_PRIORITIES } from '../utils/constants';
import { fmtDMY, initials } from '../utils/date';
import { isTaskActive } from '../utils/entityState';
import { Ic, ICONS } from './Icons';
import { getProjectColor } from '../utils/projectHelpers';
import ProjectProgress from './ProjectProgress';
import FloatingMenu from './FloatingMenu';
import { buildProjectMenu } from './menus';

export default function Projects({
  db,
  ur,
  openProject,
  projects,
  onCloseProject,
  onCancelProject,
  openCopyProject,
  openTemplateFromProject,
}) {
  return (
    <div>
      <div className="pj-grid">
        {projects.map(p => {
          const tasks = db.tasks.filter(t => t.projectId === p.id && isTaskActive(t));
          const plan = tasks.reduce((s, t) => s + (t.plannedHours || 0), 0);
          const fact = tasks.reduce((s, t) => s + t.logs.reduce((lsum, l) => lsum + l.hours, 0), 0);
          const projectColor = getProjectColor(p);

          const menuItems = buildProjectMenu({
            project: p,
            user: ur,
            openProject,
            onClose: onCloseProject,
            onCancel: onCancelProject,
            onCopy: openCopyProject,
            onMakeTemplate: openTemplateFromProject,
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
                  <ProjectProgress project={p} plan={plan} fact={fact} />
                  <div className="pj-foot">
                    <div className="pj-avatars">
                      {tasks.slice(0, 6).map(t => {
                        const a = t.assigneeId ? db.employees.find(e => e.id === t.assigneeId) : null;
                        return a && (
                          <span key={t.id} className="avatar xs" title={`${a.last} ${a.first}`}>
                            {initials(a.first, a.last)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </FloatingMenu>
          );
        })}
      </div>
    </div>
  );
}