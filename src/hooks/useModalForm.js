// src/hooks/useModalForm.js
import { useCallback } from 'react';
import { useForm } from './useForm';
import { useAsyncSubmit } from './useAsyncSubmit';

export function useModalForm(initialValues, validate, onSubmitAsync, onError, options = {}) {
  const form = useForm(initialValues, validate);
  const async = useAsyncSubmit(onSubmitAsync, onError, options);

  const handleSubmit = useCallback(() => {
    return form.handleSubmit(async.submit);
  }, [form, async.submit]);

  return {
    ...form,
    submit: async.submit,
    isSubmitting: async.isSubmitting,
    error: async.error,
    handleSubmit,
  };
}