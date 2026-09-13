// src/hooks/useAsyncSubmit.js
import { useState, useCallback } from 'react';

export function useAsyncSubmit(asyncFn, onError, options = {}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = useCallback(async (...args) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await asyncFn(...args);
      return result;
    } catch (err) {
      setError(err);
      if (onError) onError(err);
      if (options.throwOnError) throw err;
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [asyncFn, onError, options.throwOnError]);

  return { submit, isSubmitting, error };
}