// components/Gantt/ProjectGroup.jsx
import { buildTaskTree, getTasksWord } from '../../utils/ganttHelpers';
import { getProjectColor } from '../../utils/projectHelpers';
import TaskRow from './TaskRow';

const ProjectGroup = ({
  project,
  tasks,
  days,
  DW,
  viewStart,
  viewEnd,
  db,
  openTask,
  openProject,
  getTaskSpent,
  vacOverlap,
  expandedTasks,
  setExpandedTasks,
  criticalIds,
}) => {
  const projectColor = getProjectColor(project);
  const tree = buildTaskTree(tasks);

  const renderRows = () => {
    const rows = [];
    const visited = new Set();
    const traverse = (node, level = 0) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      const isExpanded = expandedTasks.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      rows.push(
        <TaskRow
          key={node.id}
          task={node}
          level={level}
          hasChildren={hasChildren}
          expanded={isExpanded}
          onToggle={(id) => {
            setExpandedTasks((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(id)) newSet.delete(id);
              else newSet.add(id);
              return newSet;
            });
          }}
          days={days}
          DW={DW}
          viewStart={viewStart}
          viewEnd={viewEnd}
          db={db}
          openTask={openTask}
          getTaskSpent={getTaskSpent}
          vacOverlap={vacOverlap}
          isCritical={criticalIds.has(node.id)}
        />
      );
      if (isExpanded) {
        node.children.forEach((child) => traverse(child, level + 1));
      }
    };
    tree.forEach((root) => traverse(root));
    return rows;
  };

  const rows = renderRows();
  if (rows.length === 0) return null;

  return (
    <div key={project.id}>
      <div className="gantt-group">
        <div
          className="gantt-group-name cursor-pointer underline"
          onClick={() => openProject && openProject(project.id)}
          title="Открыть проект"
        >
          <span className="pdot" style={{ background: projectColor }} />
          {project.code} · {project.name}
          <span className="mut sm ml-2">
            ({rows.length} {getTasksWord(rows.length)})
          </span>
        </div>
      </div>
      {rows}
    </div>
  );
};

export default ProjectGroup;