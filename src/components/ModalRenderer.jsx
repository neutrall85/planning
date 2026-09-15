// src/components/ModalRenderer.jsx
import {
  TaskModal,
  ProjectModal,
  HoursRequestModal,
  RolesModal,
  DeptsModal,
  VacationModal,
  DelegationModal,
  VacNowModal,
  CreateEmployeeModal,
  EditEmployeeModal,
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
  openCopyTask,
  openCopyProject,
  toast,
}) {
  const { empName } = useDataHelpers(db);

  if (!modal) return null;

  const handleError = (error) => {
    console.error(error);
    if (toast) toast(error.message || 'Произошла ошибка', 'error');
  };

  const reportTemplateResult = (label, res) => {
    if (!res) return;
    if (res.failed > 0) {
      toast?.(`${label}: создано ${res.created}, с ошибками ${res.failed}`, 'warning');
    } else if (res.created > 0) {
      toast?.(`${label}: создано ${res.created}`, 'success');
    }
  };

  // Возврат из дочерней модалки к «родителю». Работает для двух сценариев:
  //   - задача создавалась как подзадача → вернуться к родителю на вкладку «Подзадачи»;
  //   - задача открыта в режиме копирования → вернуться к источнику на «Данные».
  const closeTaskWithReturn = () => {
    if (modal.returnToTaskId) {
      const sourceId = modal.returnToTaskId;
      const tab = modal.returnToTaskTab || 'subtasks';
      onClose();
      setTimeout(() => openTask(sourceId, tab), 0);
      return;
    }
    if (modal.returnToProjectId) {
      const sourceId = modal.returnToProjectId;
      const tab = modal.returnToProjectTab || 'info';
      onClose();
      setTimeout(() => openProject(sourceId, tab), 0);
      return;
    }
    onClose();
  };

  const closeProjectWithReturn = () => {
    if (modal.returnToProjectId) {
      const sourceId = modal.returnToProjectId;
      const tab = modal.returnToProjectTab || 'info';
      onClose();
      setTimeout(() => openProject(sourceId, tab), 0);
      return;
    }
    onClose();
  };

  switch (modal.type) {
    case 'task': {
      return (
        <TaskModal
          db={db}
          ur={ur}
          taskId={modal.taskId}
          copyFromId={modal.copyFromId}
          initialTab={modal.initialTab || 'form'}
          parentTaskId={modal.parentTaskId}
          initialProjectId={modal.initialProjectId}
          returnToProjectId={modal.returnToProjectId}
          returnToTaskId={modal.returnToTaskId}
          onClose={closeTaskWithReturn}
          onCopy={openCopyTask}
          onSave={async (task, isNew, extras = {}) => {
            try {
              const old = db.tasks.find(x => x.id === task.id);
              if (old && hasRole(ur, 'admin')) {
                const changes = {};
                if (old.plannedHours !== task.plannedHours) changes.plannedHours = `${old.plannedHours ?? '-'} → ${task.plannedHours ?? '-'}`;
                if (old.status !== task.status) changes.status = `${TASK_STATUSES[old.status].label} → ${TASK_STATUSES[task.status].label}`;
                if (old.assigneeId !== task.assigneeId) changes.assignee = `${empName(old.assigneeId)} → ${empName(task.assigneeId)}`;
                if (old.deadline !== task.deadline) changes.deadline = `${old.deadline ? fmtDMY(old.deadline) : '-'} → ${task.deadline ? fmtDMY(task.deadline) : '-'}`;
                if (Object.keys(changes).length) {
                  store.addAudit('Административное изменение задачи (прямое)', changes, 'task', task.id);
                }
              }

              await store.upsertTask(task);

              if (extras.templateSubtasks?.length) {
                const res = store.instantiateTemplateSubtasks(task.id, extras.templateSubtasks);
                reportTemplateResult('Подзадачи из шаблона', res);
              }

              closeTaskWithReturn();
            } catch (error) {
              handleError(error);
            }
          }}
          onDelete={async (id) => {
            try {
              const task = db.tasks.find(t => t.id === id);
              await store.deleteTask(id);
              store.addAudit('Удаление задачи', { title: task?.title }, 'task', id);
              onClose();
            } catch (error) {
              handleError(error);
            }
          }}
          onHoursReq={openHoursReq}
          patchTask={store.upsertTask.bind(store)}
          notify={(userId, text, target) => store.addNotification(userId, text, target)}
          store={store}
          spent={(task) => task.logs.reduce((s, l) => s + l.hours, 0)}
          planSum={(projectId) => db.tasks.filter(t => t.projectId === projectId).reduce((s, t) => s + (t.plannedHours || 0), 0)}
          openTask={openTask}
          toast={toast}
        />
      );
    }

    case 'project': {
      return (
        <ProjectModal
          db={db}
          ur={ur}
          projectId={modal.projectId}
          copyFromId={modal.copyFromId}
          returnToProjectId={modal.returnToProjectId}
          initialTab={modal.initialTab || 'info'}
          onClose={closeProjectWithReturn}
          onCopy={openCopyProject}
          onSave={async (p, isNew, extras = {}) => {
            try {
              const old = db.projects.find(x => x.id === p.id);
              if (old && hasRole(ur, 'admin')) {
                const changes = {};
                if (old.budget !== p.budget) changes.budget = `${old.budget ?? '-'} → ${p.budget ?? '-'}`;
                if (old.name !== p.name) changes.name = `${old.name} → ${p.name}`;
                if (old.managerId !== p.managerId) changes.manager = `${empName(old.managerId)} → ${empName(p.managerId)}`;
                if (old.status !== p.status) changes.status = `${PROJECT_STATUSES[old.status]} → ${PROJECT_STATUSES[p.status]}`;
                if (Object.keys(changes).length) {
                  store.addAudit('Административное изменение проекта (прямое)', changes, 'project', p.id);
                }
              }

              await store.upsertProject(p);
              store.addAudit(
                isNew ? 'Создание проекта' : 'Изменение проекта',
                { name: p.name, code: p.code, budget: p.budget },
                'project',
                p.id,
              );

              if (extras.templateTasks?.length) {
                const res = store.instantiateTemplateTasks(p.id, extras.templateTasks);
                reportTemplateResult('Задачи из шаблона', res);
              }

              closeProjectWithReturn();
            } catch (error) {
              handleError(error);
            }
          }}
          onDelete={async (p) => {
            try {
              await store.deleteProject(p.id);
              store.addAudit('Удаление проекта', { name: p.name }, 'project', p.id);
              onClose();
            } catch (error) {
              handleError(error);
            }
          }}
          store={store}
          openTask={openTask}
          toast={toast}
        />
      );
    }

    case 'hours':
      return (
        <HoursRequestModal
          db={db}
          ur={ur}
          kind={modal.kind}
          targetId={modal.targetId}
          onClose={onClose}
          onSubmit={async (r) => {
            try {
              await store.addHoursRequest(r);
              const target = modal.kind === 'task'
                ? db.tasks.find(t => t.id === modal.targetId)
                : db.projects.find(p => p.id === modal.targetId);
              const targetTitle = target ? (modal.kind === 'task' ? target.title : target.name) : '';
              const directorIds = db.employees.filter(e => e.roles.includes('director') && !e.fired).map(e => e.id);
              store.notifyHoursRequestCreated(r, directorIds, targetTitle);
              store.addAudit('Запрос изменения часов', { target: targetTitle, oldH: r.oldH, newH: r.newH, reason: r.reason }, 'hoursRequest', r.id);
              onClose();
            } catch (error) {
              handleError(error);
            }
          }}
          toast={toast}
        />
      );

    case 'roles':
      return (
        <RolesModal
          store={store}
          empId={modal.empId}
          onClose={onClose}
          toast={toast}
        />
      );

    case 'depts':
      return (
        <DeptsModal
          store={store}
          empId={modal.empId}
          onClose={onClose}
          toast={toast}
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
          onSave={async (v, isNew) => {
            try {
              await store.upsertVacation(v);
              store.addAudit(isNew ? 'Создание отпуска' : 'Изменение отпуска', { employee: empName(v.empId), period: `${fmtDMY(v.start)}-${fmtDMY(v.end)}` }, 'vacation', v.id);
              onClose();
            } catch (error) {
              handleError(error);
            }
          }}
          toast={toast}
        />
      );

    case 'delegation':
      return (
        <DelegationModal
          db={db}
          ur={ur}
          onClose={onClose}
          onSubmit={async (rd) => {
            try {
              await store.upsertRoleDelegation(rd);
              store.notifyRoleDelegationCreated(rd);
              store.addAudit('Создание делегирования ролей', { from: empName(rd.fromId), to: empName(rd.toId), roles: rd.roles.join(', ') }, 'delegation', rd.id);
              onClose();
            } catch (error) {
              handleError(error);
            }
          }}
          toast={toast}
        />
      );

    case 'vacnow':
      return <VacNowModal db={db} onClose={onClose} toast={toast} />;

    case 'createEmployee':
      return (
        <CreateEmployeeModal
          store={store}
          ur={ur}
          onClose={onClose}
          toast={toast}
        />
      );

    case 'editEmployee':
      return (
        <EditEmployeeModal
          store={store}
          ur={ur}
          employeeId={modal.employeeId}
          onClose={onClose}
          toast={toast}
        />
      );

    default:
      return null;
  }
}