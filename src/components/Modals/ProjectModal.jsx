// src/components/Modals/ProjectModal.jsx
import { useState, useMemo, useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { Tabs } from '../Tabs';
import { FileManager } from '../FileManager';
import { TaskTable } from '../TaskTable';
import { FormField } from '../FormField';
import ProjectChat from '../ProjectChat';
import { ProjectGallery } from '../ProjectGallery';
import { Lightbox } from '../Lightbox';
import { ProjectAccessModal } from './ProjectAccessModal';
import { HistoryTab } from '../HistoryTab';
import { useForm } from '../../hooks/useForm';
import {
  useDataHelpers,
  useControlledTab,
  useStableModalHeight,
} from '../../hooks';
import { useConfirm } from '../../context/ConfirmContext';
import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  PROJECT_PRIORITIES,
  ADMIN_PROJECT_PRIORITIES,
  DIALOGS,
  TOASTS,
  FILE_LIMITS,
  FILE_MESSAGES,
} from '../../utils/constants';
import { TODAY, iso, addDays, uid, fmtDMY } from '../../utils/date';
import {
  canEditProjectFields,
  canChangeProjectStatus,
  canCreateProject,
  canManageManager,
  canManageProjectAccess,
  hasRole,
} from '../../utils/permissions';
import { isArchived } from '../../utils/entityState';
import { getProjectColor } from '../../utils/projectHelpers';
import { prepareAttachments } from '../../utils/fileUpload';
import { createFolder } from '../../utils/fileTree';
import { Ic, ICONS } from '../Icons';
import { TemplateSelect, TemplateActions } from '../Templates';
import { applyTemplatePayload } from '../../utils/templateSchemas';
import { collectTaskPayloads } from '../../utils/templateNesting';

const AIRCRAFT_TYPES = ['Су-57', 'МиГ-35', 'Ту-160', 'Ил-76', 'Ка-52', 'Другой'];
const PROJECT_TYPE_OPTIONS = ['Ремонт', 'Модификация', 'КС', 'ИКУ'];

const stripAccess = (project) => {
  if (!project) return project;
  const { access, ...rest } = project;
  return rest;
};

const FORM_FIELDS = Object.freeze([
  'name', 'code', 'desc', 'ptype', 'customer', 'aircraftType', 'projectType',
  'priority', 'kbId', 'managerId', 'start', 'end', 'budget', 'status', 'longterm',
]);

const readFileAsPhoto = (file, uploaderId) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve({
      id: uid(),
      name: file.name,
      url: ev.target.result,
      uploadedBy: uploaderId,
      uploadedAt: new Date().toISOString(),
      isMain: false,
    });
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });

export const ProjectModal = ({
  db,
  ur,
  projectId,
  initialTab = 'info',
  copyFromId,
  returnToProjectId,
  onClose,
  onSave,
  onDelete,
  onCopy,
  toast,
  openTask,
  store,
  onTabChange,
}) => {
  const { empName, getTaskSpent } = useDataHelpers(db);
  const { confirm } = useConfirm();
  const existing = projectId ? db.projects.find(p => p.id === projectId) : null;
  const copySource = copyFromId ? db.projects.find(p => p.id === copyFromId) : null;
  const isCopy = !existing && !!copySource;
  const isNew = !existing;
  const readOnly = !!(existing && isArchived(existing));
  const canEditFields = !readOnly && (existing ? canEditProjectFields(ur, existing) : canCreateProject(ur));
  const canChangeStatus = !readOnly && existing && canChangeProjectStatus(ur, existing, null);
  const canChangeManager = !readOnly && (existing ? canManageManager(ur) : canCreateProject(ur));

  const canCreateFromProject = canCreateProject(ur);
  const canManageAccess = !readOnly && existing && canManageProjectAccess(ur, existing);

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [appliedTemplateName, setAppliedTemplateName] = useState(null);
  const [accessOpen, setAccessOpen] = useState(false);

  const [pendingTemplateTasks, setPendingTemplateTasks] = useState(() =>
    isCopy
      ? collectTaskPayloads(
          db.tasks.filter(t => t.projectId === copySource.id && !t.archived)
        )
      : []
  );

  const [activeTab, handleTabChange] = useControlledTab(initialTab, onTabChange);

  const bodyRef = useStableModalHeight(activeTab);

  const initialValues = existing
    ? stripAccess(existing)
    : isCopy
      ? {
          ...stripAccess(copySource),
          id: 'p_' + uid(),
          managerId: '',
          status: 'active',
          archived: false,
          archivedAt: null,
          closedAt: null,
          creatorId: ur.id,
          history: [
            { ts: Date.now(), who: ur.id, text: `Скопирован из «${copySource.name}»` },
          ],
          files: [],
          folders: [],
          photos: [],
        }
      : {
          id: 'p_' + uid(),
          code: '',
          name: '',
          desc: '',
          kbId: '',
          managerId: '',
          start: TODAY,
          end: iso(addDays(new Date(), 30)),
          status: 'active',
          budget: 100,
          color: '#64748b',
          ptype: 'prod',
          longterm: false,
          archived: false,
          archivedAt: null,
          closedAt: null,
          creatorId: ur.id,
          customer: '',
          aircraftType: '',
          projectType: '',
          priority: 'NORM',
          history: [{ ts: Date.now(), who: ur.id, text: 'Проект создан' }],
          files: [],
          folders: [],
          photos: [],
        };

  const validate = useCallback((values) => {
    const errors = {};
    if (!values.name?.trim()) errors.name = 'Название обязательно';
    if (!values.code?.trim()) errors.code = 'Код обязателен';
    if (!values.start) errors.start = 'Дата начала обязательна';
    if (!values.customer?.trim()) errors.customer = 'Заказчик обязателен';
    const isAdmin = values.ptype === 'admin';
    if (!isAdmin) {
      if (!values.aircraftType) errors.aircraftType = 'Выберите тип ВС';
      if (!values.projectType) errors.projectType = 'Выберите категорию';
      if (!values.managerId) errors.managerId = 'Ответственный обязателен';
      if (!values.end) errors.end = 'Дата окончания обязательна';
      if (!values.kbId) errors.kbId = 'Выберите подразделение (КБ)';
      if (!values.budget || +values.budget <= 0) errors.budget = 'Бюджет должен быть > 0';
    }
    if (!values.priority) errors.priority = 'Приоритет обязателен';
    if (!values.status) errors.status = 'Статус обязателен';
    return errors;
  }, []);

  const { values, handleChange, handleSubmit, errors, touched, setFieldValue, isValid, isDirty } =
    useForm(initialValues, validate, { fields: FORM_FIELDS });

  const draftTasks = useMemo(() => {
    if (!isNew || pendingTemplateTasks.length === 0) return [];
    return pendingTemplateTasks.map((node, idx) => ({
      id: `draft_${idx}`,
      _draft: true,
      title: node.title || 'Без названия',
      assigneeId: null,
      status: 'new',
      plannedHours: node.plannedHours ?? null,
      priority: node.priority || 'mid',
      deadline: null,
      logs: [],
      projectId: values.id,
    }));
  }, [isNew, pendingTemplateTasks, values.id]);

  const applyTemplate = useCallback((template) => {
    if (!template) {
      setAppliedTemplateName(null);
      setPendingTemplateTasks([]);
      return;
    }

    const patch = applyTemplatePayload('project', template.payload);
    const { tasks: nestedTasks, ...projectFields } = patch;
    Object.keys(projectFields).forEach(field => setFieldValue(field, projectFields[field]));

    const cleanTasks = Array.isArray(nestedTasks) ? nestedTasks : [];
    setPendingTemplateTasks(cleanTasks);
    setAppliedTemplateName(template.name);
  }, [setFieldValue]);

  const handlePhotoUpload = useCallback(async (files, onDone) => {
    try {
      const currentPhotos = values.photos || [];

      const valid = [];
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          toast(FILE_MESSAGES.notImage, 'error');
          continue;
        }
        if (file.size > FILE_LIMITS.image) {
          toast(FILE_MESSAGES.imageTooLarge, 'error');
          continue;
        }
        valid.push(file);
      }
      if (valid.length === 0) return;

      const newPhotos = await Promise.all(
        valid.map((file) => readFileAsPhoto(file, ur.id))
      );

      if (currentPhotos.length === 0 && newPhotos.length > 0) {
        newPhotos[0].isMain = true;
      }

      const updatedPhotos = [...currentPhotos, ...newPhotos];
      setFieldValue('photos', updatedPhotos);
      if (existing) store.patchProject(existing.id, { photos: updatedPhotos });
      toast(`Загружено фото: ${newPhotos.length}`, 'success');
    } catch (err) {
      toast(err.message || 'Ошибка загрузки фото', 'error');
    } finally {
      onDone?.();
    }
  }, [values.photos, existing, store, setFieldValue, toast, ur.id]);

  const handlePhotoDelete = useCallback(async (photoId) => {
    const ok = await confirm(DIALOGS.deleteProjectPhoto);
    if (!ok) return;
    const currentPhotos = values.photos || [];
    const updatedPhotos = currentPhotos.filter(p => p.id !== photoId);
    const deletedWasMain = currentPhotos.find(p => p.id === photoId)?.isMain;
    if (deletedWasMain && updatedPhotos.length > 0) {
      updatedPhotos[0].isMain = true;
    }
    setFieldValue('photos', updatedPhotos);
    if (existing) store.patchProject(existing.id, { photos: updatedPhotos });
    toast(TOASTS.photoDeleted, 'info');
  }, [values.photos, existing, store, setFieldValue, toast, confirm]);

  const handleSetMain = useCallback((photoId) => {
    const currentPhotos = values.photos || [];
    const updatedPhotos = currentPhotos.map(p => ({
      ...p,
      isMain: p.id === photoId,
    }));
    setFieldValue('photos', updatedPhotos);
    if (existing) store.patchProject(existing.id, { photos: updatedPhotos });
    toast('Главное фото обновлено', 'success');
  }, [values.photos, existing, store, setFieldValue, toast]);

  const handleOpenLightbox = useCallback((index) => {
    setLightboxIndex(index);
  }, []);

  const handleCloseLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  const handlePrevPhoto = useCallback(() => {
    if (lightboxIndex === null || lightboxIndex === undefined) return;
    const photos = values.photos || [];
    setLightboxIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  }, [lightboxIndex, values.photos]);

  const handleNextPhoto = useCallback(() => {
    if (lightboxIndex === null || lightboxIndex === undefined) return;
    const photos = values.photos || [];
    setLightboxIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  }, [lightboxIndex, values.photos]);

  const saveHandler = useCallback((vals) => {
    const isAdmin = vals.ptype === 'admin';
    if (!vals.name.trim()) { toast('Укажите название', 'error'); return; }
    if (!vals.code.trim()) { toast('Укажите код', 'error'); return; }
    if (!vals.start) { toast('Укажите дату начала', 'error'); return; }
    if (!vals.customer.trim()) { toast('Укажите заказчика', 'error'); return; }
    if (!isAdmin) {
      if (!vals.aircraftType) { toast('Выберите тип ВС', 'error'); return; }
      if (!vals.projectType) { toast('Выберите категорию', 'error'); return; }
      if (!vals.managerId) { toast('Ответственный обязателен', 'error'); return; }
      if (!vals.end) { toast('Дата окончания обязательна', 'error'); return; }
      if (!vals.kbId) { toast('Выберите подразделение (КБ)', 'error'); return; }
      if (!vals.budget || +vals.budget <= 0) { toast('Бюджет должен быть больше 0', 'error'); return; }
    }
    if (!vals.priority) { toast('Выберите приоритет', 'error'); return; }
    if (!vals.status) { toast('Выберите статус', 'error'); return; }

    const finalColor = getProjectColor(vals);
    const storeProject = db.projects.find(p => p.id === vals.id);
    const projectToSave = {
      ...vals,
      color: finalColor,
      kbId: vals.kbId || null,
      budget: isAdmin ? null : +vals.budget,
      managerId: isAdmin ? '' : vals.managerId,
      end: isAdmin ? null : vals.end,
      access: storeProject?.access || { userIds: [] },
    };
    onSave(projectToSave, isNew, { templateTasks: pendingTemplateTasks });
  }, [isNew, db.projects, toast, onSave, pendingTemplateTasks]);

  const deleteHandler = useCallback(async () => {
    const ok = await confirm(DIALOGS.deleteProject(existing.name));
    if (!ok) return;
    onDelete(existing.id);
  }, [existing, onDelete, confirm]);

  const filesCount = values.files?.length || 0;

  const taskList = useMemo(() => {
    if (!existing) return [];
    return db.tasks.filter(t => t.projectId === projectId && !t.archived);
  }, [db.tasks, projectId, existing]);

  const displayedTasks = useMemo(
    () => [...draftTasks, ...taskList],
    [draftTasks, taskList]
  );

  const tasksCount = displayedTasks.length;

  const tabs = [
    { id: 'info', label: 'Информация' },
    { id: 'tasks', label: `Задачи (${tasksCount})` },
    { id: 'chat', label: `Чат проекта (${store.getComments({ projectId: values.id }).length})` },
    { id: 'files', label: `Вложения (${filesCount})` },
    ...(existing ? [{ id: 'hist', label: 'История' }] : []),
  ];

  const kbOptions = useMemo(() => db.kbs.map(k => ({ value: k.id, label: k.name })), [db.kbs]);
  const employeeOptions = useMemo(() => db.employees.filter(e => !e.fired).map(e => ({ value: e.id, label: `${e.last} ${e.first}` })), [db.employees]);
  const priorityOptions = values.ptype === 'admin'
    ? Object.entries(ADMIN_PROJECT_PRIORITIES).map(([k, v]) => ({ value: k, label: v.label }))
    : Object.entries(PROJECT_PRIORITIES).map(([k, v]) => ({ value: k, label: v.label }));
  const statusOptions = Object.entries(PROJECT_STATUSES).map(([k, v]) => ({ value: k, label: v }));
  const isAdminProject = values.ptype === 'admin';

  const candidates = useMemo(() => {
    const ids = new Set(
      db.tasks
        .filter(t => t.projectId === values.id)
        .map(t => t.assigneeId)
        .filter(Boolean)
    );
    if (values.managerId) ids.add(values.managerId);
    return [...ids].map(id => db.employees.find(e => e.id === id)).filter(Boolean);
  }, [db, values.id, values.managerId]);

  const handleFileUpload = useCallback(async (files, folderId = null) => {
    const result = await prepareAttachments(files, values.files, folderId, ur.id);

    if (result.accepted > 0) {
      setFieldValue('files', result.nextFiles);
      if (existing) store.patchProject(existing.id, { files: result.nextFiles });
      toast(
        result.accepted === 1 ? TOASTS.fileUploaded : TOASTS.filesUploaded(result.accepted),
        'success'
      );
    }
    if (result.rejected > 0) {
      toast(TOASTS.filesRejected(result.errors.join('; ')), 'warning');
    }
  }, [values.files, existing, store, setFieldValue, toast, ur.id]);

  const handleFileDelete = useCallback(async (fileId) => {
    const ok = await confirm(DIALOGS.deleteFile);
    if (!ok) return;
    const updatedFiles = (values.files || []).filter(f => f.id !== fileId);
    setFieldValue('files', updatedFiles);
    if (existing) store.patchProject(existing.id, { files: updatedFiles });
    toast(TOASTS.fileDeleted, 'info');
  }, [values.files, existing, store, setFieldValue, toast, confirm]);

  const handleCreateFolder = useCallback((name, parentId) => {
    const newFolder = createFolder(name, parentId, ur.id);
    const updatedFolders = [...(values.folders || []), newFolder];
    setFieldValue('folders', updatedFolders);
    if (existing) store.patchProject(existing.id, { folders: updatedFolders });
  }, [values.folders, existing, store, setFieldValue, ur.id]);

  const handleDeleteFolder = useCallback((folderId) => {
    const updatedFolders = (values.folders || []).filter(f => f.id !== folderId);
    setFieldValue('folders', updatedFolders);
    if (existing) store.patchProject(existing.id, { folders: updatedFolders });
  }, [values.folders, existing, store, setFieldValue]);

  const saveDisabled = !(canEditFields || (existing && canChangeStatus) || canChangeManager)
    || (isNew ? !isValid : !isValid || !isDirty);

  const showBackButton = !!returnToProjectId;

  const modalTitle = readOnly
    ? 'Проект (Архив)'
    : existing
      ? 'Карточка проекта'
      : isCopy
        ? `Копирование проекта: ${copySource.name}`
        : 'Новый проект';

  const footer = (
    <div className="modal-foot">
      {!readOnly && existing && hasRole(ur, 'admin') && (
        <button className="btn danger" onClick={deleteHandler}>
          <Ic d={ICONS.trash} size={14} /> Удалить проект
        </button>
      )}

      {existing && onCopy && canCreateFromProject && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => onCopy(existing.id)}
          title="Создать новый проект на основе этого"
        >
          <Ic d={ICONS.copy} size={13} /> Копировать
        </button>
      )}

      {canCreateFromProject && (
        <TemplateActions
          kind="project"
          source={values}
          nested={existing ? collectTaskPayloads(
            db.tasks.filter(t => t.projectId === existing.id && !t.archived)
          ) : []}
          toast={toast}
          disabled={!values.name?.trim()}
        />
      )}

      {canManageAccess && (
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setAccessOpen(true)}
          title="Управление доступом к проекту"
        >
          <Ic d={ICONS.shield} size={13} /> Доступ
        </button>
      )}

      <div className="spacer" />
      <button className="btn ghost" onClick={onClose}>Отмена</button>
      <button className="btn primary" onClick={handleSubmit(saveHandler)} disabled={saveDisabled}>
        {isNew ? 'Создать проект' : 'Сохранить'}
      </button>
    </div>
  );

  return (
    <>
      <ModalShell
        title={modalTitle}
        onClose={onClose}
        width={900}
        className="modal-project"
        showSave={false}
        footer={footer}
        bodyRef={bodyRef}
        showBack={showBackButton}
      >
        {readOnly && (
          <div className="info-box">
            {existing.archivedAt
              ? `Проект в архиве с ${fmtDMY(existing.archivedAt)}. Редактирование запрещено.`
              : `Проект ${existing.status === 'cancelled' ? 'отменён' : 'закрыт'}. Редактирование запрещено.`}
          </div>
        )}

        <Tabs tabs={tabs} active={activeTab} onChange={handleTabChange} />

        {activeTab === 'info' && (
          <div className="project-info-layout">
            <div className="project-info-photos">
              <ProjectGallery
                photos={values.photos || []}
                onUpload={handlePhotoUpload}
                onDelete={handlePhotoDelete}
                onSetMain={handleSetMain}
                onOpenLightbox={handleOpenLightbox}
                canUpload={!readOnly && canEditFields}
                canDelete={!readOnly && canEditFields}
                employeeName={empName}
              />
            </div>

            <div className="project-info-fields-wrap">
              <div className="project-info-fields">
                {isNew && !isCopy && (
                  <TemplateSelect kind="project" onApply={applyTemplate} />
                )}

                {isNew && appliedTemplateName && (
                  <div className="info-box">
                    Применён шаблон: <b>{appliedTemplateName}</b>
                  </div>
                )}

                <FormField label="Название" required value={values.name} onChange={(v) => handleChange('name', v)} error={touched.name && errors.name} disabled={!canEditFields} inline />
                <FormField label="Описание" type="textarea" rows={2} value={values.desc} onChange={(v) => handleChange('desc', v)} disabled={!canEditFields} inline />
                <FormField label="Заказчик" required value={values.customer} onChange={(v) => handleChange('customer', v)} error={touched.customer && errors.customer} disabled={!canEditFields} inline />

                <div className="fields-row">
                  <FormField label="Тип проекта" required type="select" options={Object.entries(PROJECT_TYPES).map(([k, v]) => ({ value: k, label: v }))} value={values.ptype} onChange={(v) => handleChange('ptype', v)} disabled={!canEditFields} inline />
                  <FormField label="Код" required value={values.code} onChange={(v) => handleChange('code', v)} error={touched.code && errors.code} disabled={!canEditFields} inline />
                </div>

                {!isAdminProject && (
                  <div className="fields-row">
                    <FormField label="Тип ВС" required type="select" options={AIRCRAFT_TYPES.map(t => ({ value: t, label: t }))} value={values.aircraftType} onChange={(v) => handleChange('aircraftType', v)} error={touched.aircraftType && errors.aircraftType} disabled={!canEditFields} inline />
                    <FormField label="Категория" required type="select" options={PROJECT_TYPE_OPTIONS.map(t => ({ value: t, label: t }))} value={values.projectType} onChange={(v) => handleChange('projectType', v)} error={touched.projectType && errors.projectType} disabled={!canEditFields} inline />
                  </div>
                )}

                <div className="fields-row">
                  <FormField label="Приоритет" required type="select" options={priorityOptions} value={values.priority} onChange={(v) => handleChange('priority', v)} error={touched.priority && errors.priority} disabled={!canEditFields} inline />
                  <FormField label="Подразделение" required={!isAdminProject} type="select" options={kbOptions} value={values.kbId} onChange={(v) => handleChange('kbId', v)} error={touched.kbId && errors.kbId} disabled={!canEditFields} inline />
                </div>

                <div className="fields-row">
                  <FormField label="Дата начала" required type="date" value={values.start} onChange={(v) => handleChange('start', v)} error={touched.start && errors.start} disabled={!canEditFields} inline />
                  <FormField label="Дата окончания" required={!isAdminProject} type="date" value={values.end} onChange={(v) => handleChange('end', v)} error={touched.end && errors.end} disabled={!canEditFields || isAdminProject} inline />
                </div>

                <div className="fields-row">
                  <FormField label="Бюджет, ч" required={!isAdminProject} type="number" min="0" step="0.5" value={values.budget} onChange={(v) => handleChange('budget', v)} error={touched.budget && errors.budget} disabled={!canEditFields || isAdminProject} inline />
                  <FormField label="Статус" required type="select" options={statusOptions} value={values.status} onChange={(v) => handleChange('status', v)} error={touched.status && errors.status} disabled={!canChangeStatus} inline />
                </div>

                {!isAdminProject && (
                  <FormField
                    label="Ответственный"
                    required
                    type="select"
                    options={employeeOptions}
                    value={values.managerId}
                    onChange={(v) => handleChange('managerId', v)}
                    error={touched.managerId && errors.managerId}
                    disabled={!canChangeManager}
                    inline
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (existing || draftTasks.length > 0) && (
          <div className="tm-block">
            <div className="subtask-header">
              <div className="rep-panel-title">Задачи проекта</div>
              {existing && (
                <button
                  className="btn primary sm"
                  onClick={() => { openTask(null, 'form', null, existing.id, existing.id); }}
                  disabled={readOnly}
                >
                  <Ic d={ICONS.plus} size={14} /> Создать задачу
                </button>
              )}
            </div>
            <TaskTable
              tasks={displayedTasks}
              onRowClick={(id) => { openTask(id, 'form', null, null, existing.id); }}
              columns={['title', 'assignee', 'status', 'planned', 'fact', 'deadline']}
              db={db}
              getTaskSpent={getTaskSpent}
              empName={empName}
            />
          </div>
        )}

        {activeTab === 'chat' && (
          <ProjectChat
            projectId={values.id}
            store={store}
            currentUser={ur}
            toast={toast}
            employees={db.employees}
            candidates={candidates}
            openTask={openTask}
            tasks={db.tasks}
            readOnly={readOnly}
          />
        )}

        {activeTab === 'files' && (
          <FileManager
            files={values.files || []}
            folders={values.folders || []}
            onUpload={handleFileUpload}
            onDelete={handleFileDelete}
            onCreateFolder={handleCreateFolder}
            onDeleteFolder={handleDeleteFolder}
            canUpload={!readOnly && (canEditFields || values.managerId === ur.id || hasRole(ur, 'admin', 'director', 'project_manager'))}
            canDelete={!readOnly && (canEditFields || values.managerId === ur.id || hasRole(ur, 'admin', 'director', 'project_manager'))}
            employeeName={empName}
          />
        )}

        {activeTab === 'hist' && existing && (
          <HistoryTab history={values.history || []} empName={empName} />
        )}

        {lightboxIndex !== null && (values.photos || []).length > 0 && (
          <Lightbox
            photos={values.photos || []}
            currentIndex={lightboxIndex}
            onClose={handleCloseLightbox}
            onPrev={handlePrevPhoto}
            onNext={handleNextPhoto}
          />
        )}
      </ModalShell>

      {accessOpen && existing && (
        <ProjectAccessModal
          db={db}
          projectId={existing.id}
          store={store}
          toast={toast}
          onClose={() => setAccessOpen(false)}
        />
      )}
    </>
  );
};