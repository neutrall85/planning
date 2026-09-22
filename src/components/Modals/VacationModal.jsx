// src/components/Modals/VacationModal.jsx
import { useCallback } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { Ic, ICONS } from '../Icons';
import { useForm } from '../../hooks/useForm';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { useDataHelpers } from '../../hooks/useDataHelpers';
import { useConfirm } from '../../context/ConfirmContext';
import {
  canManageAllVacations,
  canManageVacation,
  canCreateVacationFor,
  canApproveVacation,
  canEditVacationDelegation,
} from '../../utils/permissions';
import { getPrimaryDeptName } from '../../utils/helpers';
import {
  VACATION_TYPES,
  TASK_STATUSES,
} from '../../utils/constants';
import { TODAY, iso, addDays, uid, fmtDMY } from '../../utils/date';

const FIELDS = Object.freeze([
  'empId',
  'start',
  'end',
  'type',
  'comment',
  'status',
  'delegation',
]);

/**
 * Модалка создания/редактирования/просмотра отпуска.
 *
 * Статус «Отклонён» сознательно отсутствует в списке опций: отклонение -
 * это решение с обязательной причиной, оно принимается через раздел
 * «Запросы и заявки» (Requests.jsx) с модалкой RejectionReasonModal.
 *
 * Про статус approved - один предикат на все интерфейсы: canApproveVacation.
 *
 *   - Создание нового отпуска (isNew):
 *       - HR/admin/director с указанным forEmpId - кадровая операция,
 *         отпуск заводится сразу согласованным. Опции pending и approved.
 *       - обычный сотрудник (forEmpId не указан) - только pending.
 *         Опции нет вообще, выбор не его.
 *
 *   - Редактирование существующего:
 *       - approved остаётся доступной опцией, если canApproveVacation
 *         на эту запись возвращает true. Admin/director и руководитель
 *         отдела сотрудника/главный конструктор КБ получают выбор
 *         pending ↔ approved.
 *       - если предикат false (типичный случай - HR на чужом pending),
 *         опция только pending. Поле скрыто, потому что выбора нет.
 *
 * Правило «утверждённый отпуск заморожен» живёт в сервисе через
 * canManageVacation, и здесь отражается в readOnly: у HR на чужом
 * approved все поля disabled, футер - одна кнопка «Закрыть», нет ни
 * Save, ни Delete.
 *
 * У делегирования - своё, более узкое правило: HR не видит поле даже
 * в неутверждённых чужих отпусках (canEditVacationDelegation). Кому
 * передать задачи - решение самого сотрудника.
 */
export const VacationModal = ({ db, ur, vacationId, forEmpId, onClose, onSave, onDelete, toast }) => {
  const { empName } = useDataHelpers(db);
  const { confirm } = useConfirm();
  const existing = vacationId ? db.vacations.find(v => v.id === vacationId) : null;
  const isNew = !existing;
  const canPick = canManageAllVacations(ur);
  const isRejected = existing?.status === 'rejected';
  const isApproved = existing?.status === 'approved';

  const {
    values,
    handleChange,
    handleSubmit,
    errors,
    touched,
  } = useForm(
    existing
      ? { ...existing, delegation: { ...existing.delegation } }
      : {
          id: 'v_' + uid(),
          empId: forEmpId || ur.id,
          start: TODAY,
          end: iso(addDays(new Date(), 7)),
          type: 'annual',
          comment: '',
          status: canPick && forEmpId ? 'approved' : 'pending',
          delegation: {
            enabled: false,
            subId: '',
            statuses: [],
            state: null,
          },
        },
    useCallback((values) => {
      const errors = {};
      if (!values.start) errors.start = 'Дата начала обязательна';
      if (!values.end) errors.end = 'Дата окончания обязательна';
      if (values.end && values.start && values.end < values.start) {
        errors.end = 'Дата окончания должна быть позже начала';
      }
      if (values.delegation.enabled && !values.delegation.subId) {
        errors['delegation.subId'] = 'Выберите замещающего сотрудника';
      }
      if (values.empId) {
        if (db.vacations.some(v =>
          v.empId === values.empId
          && v.id !== values.id
          && v.status === 'approved'
          && v.start <= values.end
          && v.end >= values.start
        )) {
          errors.start = 'У сотрудника уже есть утверждённый отпуск в этот период';
        }
      }
      return errors;
    }, [db, existing]),
    { fields: FIELDS },
  );

  /**
   * Право управлять конкретным отпуском / создавать его.
   *
   *   - существующий: canManageVacation. false для HR на approved,
   *     true для admin/director на любом, true для HR и владельца на
   *     неутверждённом;
   *
   *   - создаваемый: canCreateVacationFor по values.empId. Если HR
   *     сменил сотрудника в селекте, правило пересчитается - смотрим
   *     на values.empId, а не на forEmpId.
   */
  const targetEmpId = existing ? existing.empId : values.empId;
  const canManage = existing
    ? canManageVacation(ur, existing)
    : canCreateVacationFor(ur, targetEmpId);
  const readOnly = !!existing && !canManage;

  const { submit: save, isSubmitting } = useAsyncSubmit(
    // onSave (handleVacationSave в ModalRenderer) сам закрывает модалку
    // при успехе и сам показывает тост при ошибке. Не дублируем ни то,
    // ни другое: раньше onClose() здесь срабатывал даже на ошибке -
    // модалка закрывалась, пользователь терял несохранённые поля.
    useCallback(async (vals) => {
      await onSave(vals, isNew);
    }, [onSave, isNew]),
    (error) => {
      toast(error.message || 'Ошибка сохранения отпуска', 'error');
    },
  );

  const handleDelete = useCallback(async () => {
    if (!existing || !onDelete) return;
    if (!await confirm({
      title: 'Удалить отпуск',
      message: `Удалить отпуск ${fmtDMY(existing.start)}–${fmtDMY(existing.end)}?`,
      confirmLabel: 'Удалить',
      danger: true,
    })) return;
    try {
      await onDelete(existing.id);
      onClose();
    } catch (error) {
      toast(error.message || 'Ошибка удаления отпуска', 'error');
    }
  }, [existing, onDelete, confirm, onClose, toast]);

  const employeeOptions = db.employees.map(e => ({
    value: e.id,
    label: `${empName(e.id)} - ${getPrimaryDeptName(e, db)}`,
  }));

  const substituteOptions = db.employees
    .filter(e => e.id !== values.empId)
    .map(e => ({
      value: e.id,
      label: `${empName(e.id)} - ${getPrimaryDeptName(e, db)}`,
    }));

  /**
   * Опции статуса.
   *
   * Один предикат - canApproveVacation - определяет, доступна ли опция
   * approved. Это ровно тот же предикат, который стоит в VacationService
   * на переходе в approved, и который стоит в decide(). Одна группа
   * пользователей на все интерфейсы: то, что показывает форма, гарантированно
   * сохранится без сюрпризов.
   *
   * Для нового отпуска:
   *   - HR/admin/director с forEmpId - кадровая операция, опция approved
   *     доступна (это и есть смысл открытия модалки с указанным
   *     сотрудником);
   *   - остальные - только pending.
   *
   * Для существующего - canApproveVacation. Здесь проверка идёт по
   * существующей записи: empId известен, статус не важен (предикат
   * смотрит только на то, является ли actor руководителем/ГК этого
   * сотрудника).
   */
  const statusOptions = (() => {
    if (isRejected) return [];
    if (isNew) {
      const opts = [{ value: 'pending', label: 'На утверждении' }];
      if (canPick && forEmpId) {
        opts.push({ value: 'approved', label: 'Утверждён' });
      }
      return opts;
    }
    const opts = [{ value: 'pending', label: 'На утверждении' }];
    if (canApproveVacation(ur, existing, db)) {
      opts.push({ value: 'approved', label: 'Утверждён' });
    }
    return opts;
  })();

  const typeOptions = Object.entries(VACATION_TYPES).map(([k, v]) => ({
    value: k,
    label: v,
  }));

  const statusList = ['new', 'inwork', 'review'].map(s => ({
    value: s,
    label: TASK_STATUSES[s].label,
  }));

  // В readOnly делегирование скрыто целиком - вместе со всей правкой.
  const canEditDelegation = !readOnly && canEditVacationDelegation(ur, values.empId);

  // Удалять можно ровно тех, кем можно управлять. В readOnly это false.
  const canDelete = !!existing && !!onDelete && canManage;

  // Поле статуса скрываем, когда выбора фактически нет: одна опция -
  // это не «выбор», а состояние. Показывать селект с единственным
  // значением бессмысленно.
  const showStatusField = !readOnly && statusOptions.length > 1;

  const title = readOnly
    ? 'Просмотр отпуска'
    : existing
      ? 'Редактирование отпуска'
      : 'Новый отпуск';

  const readOnlyFooter = (
    <div className="modal-foot">
      <div className="spacer" />
      <button type="button" className="btn ghost" onClick={onClose}>Закрыть</button>
    </div>
  );

  return (
    <ModalShell
      title={title}
      onClose={onClose}
      onSave={readOnly ? undefined : handleSubmit(save)}
      saveLabel="Сохранить"
      width={560}
      className="modal-vacation"
      saveDisabled={isSubmitting}
      footer={readOnly ? readOnlyFooter : null}
      showSave={!readOnly}
      actions={canDelete ? (
        <button
          type="button"
          className="btn danger"
          onClick={handleDelete}
          disabled={isSubmitting}
        >
          <Ic d={ICONS.trash} size={14} /> Удалить
        </button>
      ) : null}
    >
      {readOnly && (
        <div className="info-box">
          {isApproved
            ? 'Утверждённый отпуск нельзя редактировать или удалить. Изменения вносит администратор или генеральный директор.'
            : 'Изменение этого отпуска недоступно для вашей роли.'}
        </div>
      )}

      <div className="project-info-fields">
        {canPick && (
          <FormField
            label="Сотрудник"
            required
            type="select"
            options={employeeOptions}
            value={values.empId}
            onChange={(v) => handleChange('empId', v)}
            disabled={!!existing}
          />
        )}
        <FormField
          label="Дата начала"
          required
          type="date"
          value={values.start}
          onChange={(v) => handleChange('start', v)}
          error={touched.start && errors.start}
          disabled={readOnly}
        />
        <FormField
          label="Дата окончания"
          required
          type="date"
          value={values.end}
          onChange={(v) => handleChange('end', v)}
          error={touched.end && errors.end}
          disabled={readOnly}
        />
        <FormField
          label="Тип отпуска"
          required
          type="select"
          options={typeOptions}
          value={values.type}
          onChange={(v) => handleChange('type', v)}
          disabled={readOnly}
        />
        <FormField
          label="Комментарий"
          value={values.comment}
          onChange={(v) => handleChange('comment', v)}
          disabled={readOnly}
        />
        {showStatusField && (
          <FormField
            label="Статус"
            type="select"
            options={statusOptions}
            value={values.status}
            onChange={(v) => handleChange('status', v)}
          />
        )}
        {isRejected && (
          <div className="info-box">
            <div>
              Отпуск отклонён.
              {existing.rejectionReason && <> Причина: {existing.rejectionReason}</>}
            </div>
            <div className="mut sm mt-1">
              Отклонение принимается в разделе «Запросы и заявки». Переоткрыть отпуск через форму нельзя.
            </div>
          </div>
        )}
      </div>

      {canEditDelegation && (
        <div className="tm-block">
          <div className="field-row">
            <label className="field-label">Делегирование</label>
            <div className="flex-1">
              <label className="roles-item" style={{ border: 'none', padding: 0 }}>
                <input
                  type="checkbox"
                  checked={values.delegation.enabled}
                  onChange={(e) => handleChange('delegation.enabled', e.target.checked)}
                />
                <b>Делегировать задачи на время отпуска</b>
              </label>
            </div>
          </div>

          {values.delegation.enabled && (
            <>
              <FormField
                label="Замещающий сотрудник"
                required
                type="select"
                options={substituteOptions}
                value={values.delegation.subId}
                onChange={(v) => handleChange('delegation.subId', v)}
                error={touched['delegation.subId'] && errors['delegation.subId']}
              />
              <div className="field-row">
                <label className="field-label">Какие задачи</label>
                <div className="sub-picks">
                  {statusList.map(s => (
                    <label className="dept-pick" key={s.value}>
                      <input
                        type="checkbox"
                        checked={values.delegation.statuses.includes(s.value)}
                        onChange={(e) => {
                          const newStatuses = e.target.checked
                            ? [...values.delegation.statuses, s.value]
                            : values.delegation.statuses.filter(x => x !== s.value);
                          handleChange('delegation.statuses', newStatuses);
                        }}
                      />
                      {s.label}
                    </label>
                  ))}
                  <span className="mut sm">пусто = все активные задачи</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </ModalShell>
  );
};