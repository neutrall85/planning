// src/hooks/useModalForm.js
import { useCallback } from 'react';
import { useForm } from './useForm';
import { useAsyncSubmit } from './useAsyncSubmit';

/**
 * Комбинирует useForm и useAsyncSubmit для модальных форм.
 *
 * Оставляет useForm и useAsyncSubmit раздельными, а не сливает их в один хук:
 * каждый из них имеет единственную ответственность (валидация формы / асинхронная
 * отправка) и тестируется отдельно. Комбинированный хук дал бы меньше гибкости
 * при тестировании поведения submitting/error в изоляции.
 *
 * options пробрасывается в оба хука как есть:
 *   - useForm читает options.fields (обязателен, см. комментарий в useForm);
 *   - useAsyncSubmit читает options.throwOnError.
 * Ключи не пересекаются, поэтому один объект безопасно передавать дважды.
 *
 * Раньше options передавался только в useAsyncSubmit, а в useForm шёл без
 * третьего аргумента. Это работало до тех пор, пока useForm не начал
 * требовать fields.
 */
export function useModalForm(initialValues, validate, onSubmitAsync, onError, options = {}) {
  const form = useForm(initialValues, validate, options);
  const submission = useAsyncSubmit(onSubmitAsync, onError, options);

  const handleSubmit = useCallback(() => {
    return form.handleSubmit(submission.submit);
  }, [form, submission.submit]);

  return {
    ...form,
    submit: submission.submit,
    isSubmitting: submission.isSubmitting,
    error: submission.error,
    handleSubmit,
  };
}