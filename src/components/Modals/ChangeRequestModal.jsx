// src/components/Modals/ChangeRequestModal.jsx
import { useCallback, useMemo } from 'react';
import { ModalShell } from '../ModalShell';
import { FormField } from '../FormField';
import { useForm } from '../../hooks/useForm';
import { useAsyncSubmit } from '../../hooks/useAsyncSubmit';
import { uid } from '../../utils/date';
import { requireChangeKind } from '../../utils/changeKinds';

/**
 * Единая модалка запроса изменения. Вид изменения (часы / срок / …)
 * полностью параметризует форму через реестр utils/changeKinds:
 *   - label        — заголовок окна;
 *   - inputType    — тип поля «Новое значение»;
 *   - currentOf    — как показать текущее значение;
 *   - validateNew  — правило валидации нового значения;
 *   - formatValue  — как форматировать значения в UI;
 *   - targetTypes  — к каким типам сущностей вид применим.
 *
 * Ни одна ветка по changeKind здесь не хардкожена: добавление нового
 * вида (например, «изменение приоритета задачи») сводится к записи
 * в реестре, без правок этого файла.
 *
 * Ранняя проверка совместимости (changeKind, targetType) — до рендера
 * формы. В нормальной работе UI её гарантирует (кнопка запроса
 * показывается только в подходящем контексте: у задачи — срок, у
 * задачи или проекта — часы). Проверка нужна как страховка от прямого
 * вызова openChangeReq из консоли или от нового кода, забывшего про
 * правило реестра: вместо исключения из ChangeRequestService
 * пользователь увидит понятное сообщение и одна кнопка «Закрыть».
 *
 * Хуки (useMemo, useForm, useAsyncSubmit) выполняются безусловно —
 * правило Hooks не даёт права «пропустить» их при раннем возврате.
 * Соответственно, все значения, от которых зависят хуки, вычисляются
 * до проверки isApplicable; сама проверка — уже после них.
 */
export const ChangeRequestModal = ({
  db, ur, changeKind, targetType, targetId, onClose, onSubmit, toast,
}) => {
  const kind = requireChangeKind(changeKind);
  const isApplicable = kind.targetTypes.includes(targetType);

  const target = targetType === 'task'
    ? db.tasks.find(t => t.id === targetId)
    : db.projects.find(p => p.id === targetId);

  const current = target ? kind.currentOf(target, targetType) : null;

  const fields = useMemo(() => Object.freeze(['newValue', 'reason']), []);

  const { values, handleChange, handleSubmit, errors, touched } = useForm(
    { newValue: current ?? '', reason: '' },
    useCallback((vals) => {
      // Форма не будет показана, если isApplicable === false; возвращать
      // осмысленные ошибки тут нечего — пустой объект, чтобы isValid
      // остался true и никакие побочные эффекты не сработали.
      if (!isApplicable) return {};
      const errs = {};
      const newErr = kind.validateNew(vals.newValue, current);
      if (newErr) errs.newValue = newErr;
      if (!vals.reason.trim()) errs.reason = 'Укажите обоснование';
      return errs;
    }, [kind, current, isApplicable]),
    { fields },
  );

  const { submit: save, isSubmitting } = useAsyncSubmit(
    useCallback(async (vals) => {
      // Симметрично validate: при несовместимой паре не должно быть
      // возможности отправить запрос. Сюда не дойдёт — кнопка
      // «Сохранить» в этом режиме не рендерится, — но защита бесплатна.
      if (!isApplicable) return;
      await onSubmit({
        id: uid(),
        changeKind,
        targetType,
        targetId,
        oldValue: current,
        newValue: kind.normalizeValue(vals.newValue),
        reason: vals.reason.trim(),
        reqId: ur.id,
        status: 'pending',
        rejectionReason: null,
        ts: Date.now(),
      });
      onClose();
    }, [isApplicable, changeKind, targetType, targetId, current, kind, ur, onSubmit, onClose]),
    (error) => {
      toast(error.message || 'Ошибка отправки запроса', 'error');
    },
  );

  // ── Ранний возврат: несовместимая пара (changeKind, targetType) ─────
  if (!isApplicable) {
    return (
      <ModalShell
        title="Запрос недоступен"
        onClose={onClose}
        width={480}
        className="modal-hours"
        showSave={false}
        footer={
          <div className="modal-foot">
            <div className="spacer" />
            <button type="button" className="btn ghost" onClick={onClose}>
              Закрыть
            </button>
          </div>
        }
      >
        <p className="mut">
          Вид изменения «{kind.label}» не применим к типу целевой
          сущности «{targetType}». Запрос отменён — это защита от
          некорректного сочетания, а не ошибка ваших данных.
        </p>
      </ModalShell>
    );
  }

  // ── Основной режим: форма запроса ────────────────────────────────────
  const targetLabel = targetType === 'task' ? target?.title : target?.name;

  return (
    <ModalShell
      title={`Запрос: ${kind.label.toLowerCase()}`}
      onClose={onClose}
      onSave={handleSubmit(save)}
      saveLabel="Отправить запрос"
      width={480}
      className="modal-hours"
      saveDisabled={isSubmitting}
      showBack
    >
      <p className="mut sm">
        {targetLabel}. Запрос будет направлен генеральному директору.
      </p>
      <div className="project-info-fields">
        <FormField
          label="Текущее значение"
          disabled
          value={kind.formatValue(current)}
        />
        <FormField
          label="Новое значение"
          required
          type={kind.inputType}
          {...kind.inputProps}
          value={values.newValue ?? ''}
          onChange={(v) => handleChange('newValue', v)}
          error={touched.newValue && errors.newValue}
        />
        <FormField
          label="Обоснование"
          required
          type="textarea"
          rows={3}
          value={values.reason}
          onChange={(v) => handleChange('reason', v)}
          error={touched.reason && errors.reason}
          placeholder="Почему требуется изменение…"
        />
      </div>
    </ModalShell>
  );
};