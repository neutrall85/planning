import React from 'react';
import {
  TaskModal,
  ProjectModal,
  HoursRequestModal,
  RolesModal,
  DeptsModal,
  VacationModal,
  DelegationModal,
  VacNowModal,
} from './Modals';
import { TASK_STATUSES, PROJECT_STATUSES, ROLES } from '../utils/constants';
import { fmtDMY } from '../utils/date';
import { hasRole } from '../utils/permissions';
import { useDataHelpers } from '../hooks';

export default function ModalRenderer({
  modal,
  onClose,
  db,
  ur,
  store,
  openTask,
  openProject,
  openHoursReq,
  openRoles,
  openDepts,
  openVacation,
  openDelegation,
}) {
  const { empName } = useDataHelpers(db);

  if (!modal) return null;

  switch (modal.type) {
    case 'task':
      return (
        <TaskModal
          db={db}
          ur={ur}
          taskId={modal.taskId}
          initialTab={modal.initialTab || 'form'}
          parentTaskId={modal.parentTaskId}
          onClose={onClose}
          onSave={(task, isNew) => {
            const old = db.tasks.find(x => x.id === task.id);
            if (old && hasRole(ur, 'admin')) {
              const changes = {};
              if (old.plannedHours !== task.plannedHours) changes.plannedHours = `${old.plannedHours ?? '—'} → ${task.plannedHours ?? '—'}`;
              if (old.status !== task.status) changes.status = `${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[task.status].label}`;
              if (JSON.stringify(old.assigneeIds || []) !== JSON.stringify(task.assigneeIds || []))
                changes.assignees = `${(old.assigneeIds || []).map(id => empName(id)).join(', ')} → ${(task.assigneeIds || []).map(id => empName(id)).join(', ')}`;
              if (old.deadline !== task.deadline) changes.deadline = `${old.deadline ? fmtDMY(old.deadline) : '—'} → ${task.deadline ? fmtDMY(task.deadline) : '—'}`;
              if (Object.keys(changes).length) {
                store.addAudit('Административное изменение задачи (прямое)', changes, 'task', task.id);
              }
            }
            store.upsertTask(task);
            if (isNew) {
              (task.assigneeIds || []).forEach(id => {
                if (id !== ur.id) {
                  store.addNotification(id, `Вам назначена задача "${task.title}" (проект ${db.projects.find(p => p.id === task.projectId)?.code || '—'}).`, { targetType: 'task', targetId: task.id });
                }
              });
            }
            onClose();
          }}
          onDelete={(id) => {
            const task = db.tasks.find(t => t.id === id);
            store.deleteTask(id);
            store.addAudit('Удаление задачи', { title: task?.title }, 'task', id);
            onClose();
          }}
          onHoursReq={openHoursReq}
          patchTask={store.upsertTask.bind(store)}
          notify={(userId, text, target) => store.addNotification(userId, text, target)}
          store={store}
          spent={(task) => task.logs.reduce((s, l) => s + l.hours, 0)}
          planSum={(projectId) => db.tasks.filter(t => t.projectId === projectId).reduce((s, t) => s + (t.plannedHours || 0), 0)}
          openTask={openTask}
        />
      );

    case 'project':
      return (
        <ProjectModal
          db={db}
          ur={ur}
          projectId={modal.projectId}
          onClose={onClose}
          onSave={(p, isNew) => {
            const old = db.projects.find(x => x.id === p.id);
            if (old && hasRole(ur, 'admin')) {
              const changes = {};
              if (old.budget !== p.budget) changes.budget = `${old.budget ?? '—'} → ${p.budget ?? '—'}`;
              if (old.name !== p.name) changes.name = `${old.name} → ${p.name}`;
              if (old.managerId !== p.managerId) changes.manager = `${empName(old.managerId)} → ${empName(p.managerId)}`;
              if (old.status !== p.status) changes.status = `${PROJECT_STATUSES[old.status]} → ${PROJECT_STATUSES[p.status]}`;
              if (Object.keys(changes).length) {
                store.addAudit('Административное изменение проекта (прямое)', changes, 'project', p.id);
              }
            }
            store.upsertProject(p);
            store.addAudit(isNew ? 'Создание проекта' : 'Изменение проекта', { name: p.name, code: p.code, budget: p.budget }, 'project', p.id);
            onClose();
          }}
          onDelete={(p) => {
            store.deleteProject(p.id);
            store.addAudit('Удаление проекта', { name: p.name }, 'project', p.id);
            onClose();
          }}
          store={store}
          openTask={openTask}
        />
      );

    case 'hours':
      return (
        <HoursRequestModal
          db={db}
          ur={ur}
          kind={modal.kind}
          targetId={modal.targetId}
          onClose={onClose}
          onSubmit={(r) => {
            store.addHoursRequest(r);
            const target = modal.kind === 'task' ? db.tasks.find(t => t.id === modal.targetId) : db.projects.find(p => p.id === modal.targetId);
            const targetTitle = target ? (modal.kind === 'task' ? target.title : target.name) : '';
            
            const directors = db.employees.filter(e => e.roles.includes('director') && !e.fired);
            directors.forEach(d => {
              store.addNotification(
                d.id,
                `Запрос на изменение часов по ${modal.kind === 'task' ? 'задаче' : 'проекту'} "${targetTitle}" от ${ur.last} ${ur.first}. Обоснование: ${r.reason}.`,
                { targetType: 'hours', targetId: r.id }
              );
            });
            
            store.addNotification(
              ur.id,
              `Ваш запрос на изменение часов по ${modal.kind === 'task' ? 'задаче' : 'проекту'} "${targetTitle}" отправлен на рассмотрение ГД.`,
              { targetType: 'hours', targetId: r.id }
            );
            
            store.addAudit('Запрос изменения часов', { target: targetTitle, oldH: r.oldH, newH: r.newH, reason: r.reason }, 'hoursRequest', r.id);
            onClose();
          }}
        />
      );

    case 'roles':
      return (
        <RolesModal
          db={db}
          setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
          empId={modal.empId}
          onClose={onClose}
          audit={store.addAudit.bind(store)}
        />
      );

    case 'depts':
      return (
        <DeptsModal
          db={db}
          setDb={(fn) => { store._data = fn(store._data); store._notify(); }}
          empId={modal.empId}
          onClose={onClose}
          audit={store.addAudit.bind(store)}
        />
      );

    case 'vacation':
      return (
        <VacationModal
          db={db}
          ur={ur}
          vacationId={modal.vacationId}
          forEmpId={modal.forEmpId || null}
          onClose={onClose}
          onSave={(v, isNew) => {
            store.upsertVacation(v);
            store.addAudit(isNew ? 'Создание отпуска' : 'Изменение отпуска', { employee: empName(v.empId), period: `${fmtDMY(v.start)}—${fmtDMY(v.end)}` }, 'vacation', v.id);
            onClose();
          }}
        />
      );

    case 'delegation':
      return (
        <DelegationModal
          db={db}
          ur={ur}
          onClose={onClose}
          onSubmit={(rd) => {
            store.upsertRoleDelegation(rd);
            store.addNotification(rd.toId, `Вам предложено временное принятие ролей: ${rd.roles.map(r => ROLES[r].label).join(', ')}.`, { targetType: 'delegation', targetId: rd.id });
            store.addAudit('Создание делегирования ролей', { from: empName(rd.fromId), to: empName(rd.toId), roles: rd.roles.join(', ') }, 'delegation', rd.id);
            onClose();
          }}
        />
      );

    case 'vacnow':
      return (
        <VacNowModal
          db={db}
          onClose={onClose}
        />
      );

    default:
      return null;
  }
}