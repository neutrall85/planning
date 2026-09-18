// src/components/views/ArchiveView.jsx
import { memo } from 'react';
import Archive from '../Archive';
import { useToast } from '../../context/ToastContext';
import { TOASTS } from '../../utils/constants';
import { useTasksDb } from '../../hooks/useDb';

function ArchiveView({
  ur, openTask, openProject, setArchiveMonths, store,
}) {
  const db = useTasksDb();
  const { tasks, projects } = db;

  const { showToast } = useToast();

  const restoreTask = (id) => {
    const t = tasks.find(x => x.id === id);
    store.upsertTask({ ...t, archived: false, archivedAt: null, closedAt: null, status: 'new' });
    showToast(TOASTS.taskRestored(t.title), 'success');
  };

  const restoreProject = (id) => {
    const p = projects.find(x => x.id === id);
    store.upsertProject({ ...p, archived: false, archivedAt: null, closedAt: null, status: 'active' });
    tasks.filter(t => t.projectId === id).forEach(t => {
      store.upsertTask({ ...t, archived: false, archivedAt: null, closedAt: null, status: 'new' });
    });
    showToast(TOASTS.projectRestored(p.name), 'success');
  };

  return (
    <Archive
      db={db}
      ur={ur}
      openTask={openTask}
      openProject={openProject}
      setArchiveMonths={setArchiveMonths}
      restoreTask={restoreTask}
      restoreProject={restoreProject}
    />
  );
}

export default memo(ArchiveView);