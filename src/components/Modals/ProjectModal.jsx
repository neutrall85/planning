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
import { useForm } from '../../hooks/useForm';
import { useDataHelpers } from '../../hooks';
import { PROJECT_STATUSES, PROJECT_TYPES, PROJECT_PRIORITIES, ADMIN_PROJECT_PRIORITIES } from '../../utils/constants';
import { TODAY, iso, addDays, uid, fmtDMY, fmtDT } from '../../utils/date';
import { canEditProjectFields, canChangeProjectStatus, canCreateProject, hasRole } from '../../utils/permissions';
import { getProjectColor } from '../../utils/projectHelpers';
import { validateAttachment } from '../../utils/fileValidation';
import { appendFileVersion } from '../../utils/fileVersions';
import { Ic, ICONS } from '../Icons';

const AIRCRAFT_TYPES = ['Су-57', 'МиГ-35', 'Ту-160', 'Ил-76', 'Ка-52', 'Другой'];
const PROJECT_TYPE_OPTIONS = ['Ремонт', 'Модификация', 'КС', 'ИКУ'];

export const ProjectModal = ({
  db,
  ur,
  projectId,
  initialTab = 'info',
  onClose,
  onSave,
  onDelete,
  toast,
  openTask,
  store,
}) => {
  const { empName, getTaskSpent, getProjectStats } = useDataHelpers(db);
  const existing = projectId ? db.projects.find(p => p.id === projectId) : null;
  const isNew = !existing;
  const readOnly = !!(existing && existing.archived);
  const canEditFields = !readOnly && (existing ? canEditProjectFields(ur, existing) : canCreateProject(ur));
  const canChangeStatus = !readOnly && existing && canChangeProjectStatus(ur, existing, null);

  const [lightboxIndex, setLightboxIndex] = useState(null);

  const initialValues = existing ? { ...existing } : {
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
    photos: [],
    // Поле comments удалено: обсуждение живёт в глобальной коллекции
    // data.comments (см. миграцию в DataStore._migrateComments).
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

  const { values, handleChange, handleSubmit, errors, touched, setFieldValue, isValid, isDirty } = useForm(initialValues, validate);

  const handlePhotoUpload = useCallback((file, onDone) => {
    if (file.size > 5 * 1024 * 1024) {
      toast('Файл слишком большой (максимум 5 МБ)', 'error');
      onDone?.();
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const currentPhotos = values.photos || [];
      const newPhoto = {
        id: uid(),
        name: file.name,
        url: ev.target.result,
        uploadedBy: ur.id,
        uploadedAt: new Date().toISOString(),
        isMain: currentPhotos.length === 0,
      };
      const updatedPhotos = [...currentPhotos, newPhoto];
      setFieldValue('photos', updatedPhotos);
      if (existing) store.upsertProject({ ...values, photos: updatedPhotos });
      toast('Фото загружено', 'success');
      onDone?.();
    };
    reader.readAsDataURL(file);
  }, [values, existing, setFieldValue, store, toast, ur.id]);

  const handlePhotoDelete = useCallback((photoId) => {
    if (!window.confirm('Удалить фото?')) return;
    const currentPhotos = values.photos || [];
    const updatedPhotos = currentPhotos.filter(p => p.id !== photoId);
    const deletedWasMain = currentPhotos.find(p => p.id === photoId)?.isMain;
    if (deletedWasMain && updatedPhotos.length > 0) {
      updatedPhotos[0].isMain = true;
    }
    setFieldValue('photos', updatedPhotos);
    if (existing) store.upsertProject({ ...values, photos: updatedPhotos });
    toast('Фото удалено', 'info');
  }, [values.photos, existing, setFieldValue, store, toast]);

  const handleSetMain = useCallback((photoId) => {
    const currentPhotos = values.photos || [];
    const updatedPhotos = currentPhotos.map(p => ({
      ...p,
      isMain: p.id === photoId,
    }));
    setFieldValue('photos', updatedPhotos);
    if (existing) store.upsertProject({ ...values, photos: updatedPhotos });
    toast('Главное фото обновлено', 'success');
  }, [values.photos, existing, setFieldValue, store, toast]);

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
    const projectToSave = {
      ...vals,
      color: finalColor,
      kbId: vals.kbId || null,
      budget: isAdmin ? null : +vals.budget,
      managerId: isAdmin ? '' : vals.managerId,
      end: isAdmin ? null : vals.end,
    };
    onSave(projectToSave, isNew);
  }, [isNew, toast, onSave]);

  const deleteHandler = useCallback(() => {
    if (window.confirm('Удалить проект?')) {
      onDelete(existing.id);
    }
  }, [existing, onDelete]);

  const filesCount = values.files?.length || 0;
  const tasksCount = db.tasks.filter(t => t.projectId === values.id && !t.archived).length;

  const tabs = [
    { id: 'info', label: 'Информация' },
    { id: 'tasks', label: `Задачи (${tasksCount})` },
    { id: 'chat', label: `Чат проекта (${store.getComments({ projectId: values.id }).length})` },
    { id: 'files', label: `Файлы (${filesCount})` },
  ];
  const [activeTab, setActiveTab] = useState(initialTab);

  const taskList = useMemo(() => {
    if (!existing) return [];
    return db.tasks.filter(t => t.projectId === projectId && !t.archived);
  }, [db.tasks, projectId, existing]);

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

  const handleFileUpload = useCallback((file) => {
    const check = validateAttachment(file);
    if (!check.ok) {
      toast(check.reason, 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newFile = {
        id: uid(),
        name: file.name,
        size: file.size,
        url: ev.target.result,
        uploadedBy: ur.id,
        uploadedAt: new Date().toISOString(),
      };
      const updatedFiles = appendFileVersion(values.files || [], newFile);
      setFieldValue('files', updatedFiles);
      if (existing) store.upsertProject({ ...values, files: updatedFiles });
      toast('Файл загружен', 'success');
    };
    reader.readAsDataURL(file);
  }, [values, existing, setFieldValue, toast, ur.id, store]);

  const handleFileDelete = useCallback((fileId) => {
    if (!window.confirm('Удалить файл?')) return;
    const updatedFiles = (values.files || []).filter(f => f.id !== fileId);
    setFieldValue('files', updatedFiles);
    if (existing) store.upsertProject({ ...values, files: updatedFiles });
    toast('Файл удалён', 'info');
  }, [values, existing, setFieldValue, toast, store]);

  const saveDisabled = !(canEditFields || (existing && canChangeStatus)) || (isNew ? !isValid : !isValid || !isDirty);

  const footer = (
    <div className="modal-foot">
      {!readOnly && existing && hasRole(ur, 'admin') && (
        <button className="btn danger" onClick={deleteHandler}>
          <Ic d={ICONS.trash} size={14} /> Удалить проект
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
    <ModalShell
      title={readOnly ? 'Проект (Архив)' : existing ? 'Редактирование проекта' : 'Новый проект'}
      onClose={onClose}
      width={900}
      showSave={false}
      footer={footer}
    >
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

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
                <FormField label="Ответственный" required type="select" options={employeeOptions} value={values.managerId} onChange={(v) => handleChange('managerId', v)} error={touched.managerId && errors.managerId} disabled={!canEditFields} inline />
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && existing && (
        <div className="tm-block">
          <div className="subtask-header">
            <div className="rep-panel-title">Задачи проекта</div>
            <button className="btn primary sm" onClick={() => { openTask(null, 'form', null, existing.id, existing.id); }} disabled={readOnly}>
              <Ic d={ICONS.plus} size={14} /> Создать задачу
            </button>
          </div>
          <TaskTable
            tasks={taskList}
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
        />
      )}

      {activeTab === 'files' && (
        <FileManager
          files={values.files || []}
          onUpload={handleFileUpload}
          onDelete={handleFileDelete}
          canUpload={!readOnly && (canEditFields || values.managerId === ur.id || hasRole(ur, 'admin', 'director', 'project_manager'))}
          canDelete={!readOnly && (canEditFields || values.managerId === ur.id || hasRole(ur, 'admin', 'director', 'project_manager'))}
          employeeName={empName}
        />
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
  );
};