// src/components/Modals/TaskModal/index.jsx
import { useMemo } from 'react';
import { ModalShell } from '../../ModalShell';
import { Tabs } from '../../Tabs';
import { FileManager } from '../../FileManager';
import Discussion from '../../Discussion';
import NoteEditorModal from '../NoteEditorModal';
import {
  useDataHelpers,
  useTaskFormState,
  useTaskTemplate,
  useTaskSubtasks,
  useTaskSelectOptions,
  useTaskFileActions,
  useTaskTimeLog,
  useTaskNotes,
  useTaskSave,
  useTaskTabSync,
} from '../../../hooks';
import { useConfirm } from '../../../context/ConfirmContext';
import { fmtDMY } from '../../../utils/date';
import {
  canEditTaskFields,
  canChangeTaskStatus,
  canCreateTask,
} from '../../../utils/permissions';
import { isArchived } from '../../../utils/entityState';

import { HistoryTab } from '../../HistoryTab';
import { TaskFormTab } from './TaskFormTab';
import { TaskTimeTab } from './TaskTimeTab';
import { TaskSubtasksTab } from './TaskSubtasksTab';
import { TaskNotesTab } from './TaskNotesTab';
import { TaskModalFooter } from './TaskModalFooter';

/**
 * Карточка задачи.
 *
 * Компонент-оркестратор: сам не хранит бизнес-логику, а собирает её из
 * хуков (форма, шаблон, подзадачи, опции селектов, файлы, учёт времени,
 * заметки, сохранение, вкладки) и раскладывает результат по
 * presentational-компонентам вкладок.
 */
export const TaskModal = ({
  db, ur, taskId, initialTab = 'form', parentTaskId, initialProjectId, returnToProjectId,
  returnToTaskId,
  returnToEmployeeTasksId,
  copyFromId,
  onClose, onSave, onDelete, onHoursReq, store,
  openTask, toast, onCopy,
  onTabChange,
}) => {
  const { empName, getTaskSpent, vacOverlap } = useDataHelpers(db);
  const { confirm } = useConfirm();

  const existing = taskId ? db.tasks.find(t => t.id === taskId) : null;
  const copySource = copyFromId ? db.tasks.find(t => t.id === copyFromId) : null;
  const isCopy = !existing && !!copySource;
  const isNew = !existing;
  const readOnly = !!(existing && isArchived(existing));
  const canEditFields = !readOnly && (existing ? canEditTaskFields(ur, existing, db) : canCreateTask(ur));
  const canChangeStatus = !readOnly && existing && canChangeTaskStatus(ur, existing, null, db);
  const isAssignee = existing && existing.assigneeId === ur.id;
  const isAuthor = existing && existing.creatorId === ur.id;
  const canLog = !readOnly && (existing ? isAssignee : true) && !existing?.isSummary && !existing?.isHourly;
  const canCreateFromTask = canCreateTask(ur);
  const isProjectLocked = !!(initialProjectId || parentTaskId);

  const effectiveProjectId = useMemo(() => {
    if (initialProjectId) return initialProjectId;
    if (parentTaskId) {
      const parent = db.tasks.find(t => t.id === parentTaskId);
      if (parent) return parent.projectId;
    }
    return '';
  }, [initialProjectId, parentTaskId, db.tasks]);

  const {
    values, handleChange, updateValues, handleSubmit, errors, touched,
    setFieldValue, isValid, isDirty,
  } = useTaskFormState({
    existing, isCopy, copySource, isNew, isProjectLocked, effectiveProjectId,
    parentTaskId, db, ur,
  });

  const { appliedTemplateName, pendingTemplateSubtasks, applyTemplate } = useTaskTemplate({
    isCopy, copySource, db, setFieldValue, isProjectLocked, effectiveProjectId, toast,
  });

  const { subtasks, draftSubtasks, displayedSubtasks } = useTaskSubtasks({
    db, taskId: values.id, projectId: values.projectId, isNew, pendingTemplateSubtasks,
  });

  const project = db.projects.find(p => p.id === values.projectId);
  const isAdminProject = project && project.ptype === 'admin';

  const isSummaryChecked = values.isSummary || subtasks.length > 0 || draftSubtasks.length > 0;
  const isSummaryDisabled = !canEditFields || subtasks.length > 0;
  const hasSubtasks = subtasks.length > 0 || values.isSummary || draftSubtasks.length > 0;

  const {
    projectOptions, assigneeOptionsList, priorityOptions, statusOptions,
    dependencyOptions, dependencyTypeOptions, candidates,
  } = useTaskSelectOptions({
    db, ur, isProjectLocked, effectiveProjectId,
    taskId: values.id, projectId: values.projectId, isAssignee, canChangeStatus,
  });

  const {
    handleFileUpload, handleFileDelete, handleCreateFolder, handleDeleteFolder,
  } = useTaskFileActions({ values, existing, store, setFieldValue, toast, confirm, ur });

  const {
    logHours, setLogHours, logNote, setLogNote, logDate, setLogDate, addLog,
  } = useTaskTimeLog({ values, existing, store, ur, toast, setFieldValue, getTaskSpent });

  const {
    notesList, editingNote, openNewNote, openExistingNote, closeNoteEditor,
    handleSaveNote, handleDeleteNote,
  } = useTaskNotes({ existing, ur, store, toast });

  const { saveHandler, deleteHandler } = useTaskSave({
    existing, isNew, db, vacOverlap, toast, onSave, onDelete, ur,
    subtasks, draftSubtasks, pendingTemplateSubtasks, confirm, store, empName,
  });

  const tabs = [
    { id: 'form', label: 'Данные' },
    ...(!values.isHourly ? [{ id: 'time', label: `Учёт времени (${getTaskSpent(values)}/${values.plannedHours ?? '-'})` }] : []),
    ...(hasSubtasks ? [{ id: 'subtasks', label: `Подзадачи (${displayedSubtasks.length})` }] : []),
    ...(existing ? [
      { id: 'chat', label: `Обсуждение (${store.getComments({ taskId: values.id }).length})` },
      { id: 'files', label: `Вложения (${values.files?.length || 0})` },
      { id: 'hist', label: 'История' }
    ] : []),
    ...(isAssignee && !readOnly ? [{ id: 'notes', label: `Заметки (${notesList.length})` }] : []),
  ];

  const { activeTab, handleTabChange, bodyRef } = useTaskTabSync(initialTab, onTabChange, tabs, values.isHourly);

  const showBackButton = returnToProjectId || returnToTaskId || returnToEmployeeTasksId;
  const saveDisabled = !(canEditFields || (existing && canChangeStatus)) || (isNew ? !isValid : !isValid || !isDirty);

  const modalTitle = readOnly
    ? 'Архивная задача - только чтение'
    : existing
      ? 'Карточка задачи'
      : isCopy
        ? `Копирование задачи: ${copySource.title}`
        : 'Новая задача';

  const footer = (
    <TaskModalFooter
      readOnly={readOnly}
      existing={existing}
      canEditFields={canEditFields}
      isAuthor={isAuthor}
      onDelete={deleteHandler}
      onCopy={onCopy}
      canCreateFromTask={canCreateFromTask}
      values={values}
      db={db}
      toast={toast}
      onClose={onClose}
      onSubmit={handleSubmit(saveHandler)}
      saveDisabled={saveDisabled}
    />
  );

  return (
    <>
      <ModalShell
        title={modalTitle}
        onClose={onClose}
        width={800}
        className="modal-task"
        showSave={false}
        footer={footer}
        bodyRef={bodyRef}
        showBack={!!showBackButton}
      >
        {readOnly && (
          <div className="info-box">
            {existing.archivedAt
              ? `Задача в архиве с ${fmtDMY(existing.archivedAt)}. Редактирование запрещено.`
              : `Задача ${existing.status === 'cancelled' ? 'отменена' : 'закрыта'}. Редактирование запрещено.`}
          </div>
        )}

        <Tabs tabs={tabs} active={activeTab} onChange={handleTabChange} className="tabs-nowrap" />

        {activeTab === 'form' && (
          <TaskFormTab
            form={{ values, handleChange, updateValues, touched, errors }}
            access={{ canEditFields, canChangeStatus, isAuthor, isAssignee, isProjectLocked, isAdminProject }}
            options={{ projectOptions, assigneeOptionsList, priorityOptions, statusOptions, dependencyOptions, dependencyTypeOptions }}
            template={{ isNew, isCopy, appliedTemplateName, onApply: applyTemplate }}
            summary={{ checked: isSummaryChecked, disabled: isSummaryDisabled }}
            onRequestHours={
              !readOnly && onHoursReq && existing && isAssignee && !values.isHourly
                ? () => onHoursReq('task', values.id)
                : null
            }
          />
        )}

        {activeTab === 'time' && !values.isHourly && (
          <TaskTimeTab
            spent={getTaskSpent(values)}
            planned={values.plannedHours}
            logs={values.logs}
            empName={empName}
            canLog={canLog}
            logDate={logDate}
            setLogDate={setLogDate}
            logHours={logHours}
            setLogHours={setLogHours}
            logNote={logNote}
            setLogNote={setLogNote}
            onAddLog={addLog}
          />
        )}

        {activeTab === 'subtasks' && hasSubtasks && (
          <TaskSubtasksTab
            tasks={displayedSubtasks}
            showCreateButton={!!existing}
            readOnly={readOnly}
            onCreateSubtask={() => {
              onClose();
              setTimeout(() => openTask(null, 'form', values.id, null, null, null, values.id), 50);
            }}
            onRowClick={(id) => {
              onClose();
              setTimeout(() => openTask(id, 'form', null, null, null, null, values.id), 50);
            }}
            db={db}
            getTaskSpent={getTaskSpent}
            empName={empName}
          />
        )}

        {activeTab === 'chat' && (
          <Discussion
            store={store}
            projectId={values.projectId}
            taskId={values.id}
            currentUser={ur}
            candidates={candidates}
            readOnly={readOnly}
            toast={toast}
            employees={db.employees}
          />
        )}

        {activeTab === 'files' && existing && (
          <FileManager
            files={values.files}
            folders={values.folders}
            onUpload={handleFileUpload}
            onDelete={handleFileDelete}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            canUpload={!readOnly && (canEditFields || isAssignee || isAuthor)}
            canDelete={!readOnly && (canEditFields || isAssignee || isAuthor)}
            employeeName={empName}
          />
        )}

        {activeTab === 'hist' && existing && (
          <HistoryTab history={values.history} empName={empName} />
        )}

        {activeTab === 'notes' && isAssignee && !readOnly && existing && (
          <TaskNotesTab
            notesList={notesList}
            onNewNote={openNewNote}
            onOpenNote={openExistingNote}
          />
        )}
      </ModalShell>

      {editingNote && (
        <NoteEditorModal
          note={editingNote}
          onSave={handleSaveNote}
          onDelete={handleDeleteNote}
          onClose={closeNoteEditor}
        />
      )}
    </>
  );
};