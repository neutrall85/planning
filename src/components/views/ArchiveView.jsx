import React from 'react';
import Archive from '../Archive';
import { TODAY } from '../../utils/date';

export default function ArchiveView({ db, ur, openTask, openProject, setArchiveMonths, store }) {
  const restoreTask = (id) => {
    const t = db.tasks.find(x => x.id === id);
    store.upsertTask({ ...t, archived: false, archivedAt: null, closedAt: null, status: 'new' });
  };
  const restoreProject = (id) => {
    const p = db.projects.find(x => x.id === id);
    store.upsertProject({ ...p, archived: false, archivedAt: null, closedAt: null, status: 'active' });
    db.tasks.filter(t => t.projectId === id).forEach(t => {
      store.upsertTask({ ...t, archived: false, archivedAt: null, closedAt: null, status: 'new' });
    });
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