import Archive from '../Archive';
import { useToast } from '../../context/ToastContext';
import { TOASTS } from '../../utils/constants';

export default function ArchiveView({ db, ur, openTask, openProject, setArchiveMonths, store }) {
  const { showToast } = useToast();

  const restoreTask = (id) => {
    const t = db.tasks.find(x => x.id === id);
    store.upsertTask({ ...t, archived: false, archivedAt: null, closedAt: null, status: 'new' });
    showToast(TOASTS.taskRestored(t.title), 'success');
  };

  const restoreProject = (id) => {
    const p = db.projects.find(x => x.id === id);
    store.upsertProject({ ...p, archived: false, archivedAt: null, closedAt: null, status: 'active' });
    db.tasks.filter(t => t.projectId === id).forEach(t => {
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