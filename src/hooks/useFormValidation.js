/**
 * Хук для валидации форм с использованием Zod схем
 * Унифицирует валидацию форм во всём приложении
 * @param {Object} schema - Zod схема для валидации
 * @returns {Object} Функции и состояния для валидации формы
 */
import { useState, useCallback } from 'react';
import { validateData, sanitizeObject } from '../utils/validation';

export const useFormValidation = (schema) => {
  const [errors, setErrors] = useState([]);
  const [isValidating, setIsValidating] = useState(false);

  // Валидация данных по схеме
  const validate = useCallback((data) => {
    setIsValidating(true);
    try {
      const result = validateData(data, schema);
      if (result.success) {
        setErrors([]);
        return { valid: true, data: result.data };
      } else {
        setErrors(result.errors);
        return { valid: false, errors: result.errors };
      }
    } catch (error) {
      const errorResult = { 
        valid: false, 
        errors: [{ field: 'unknown', message: error.message || 'Неизвестная ошибка' }] 
      };
      setErrors(errorResult.errors);
      return errorResult;
    } finally {
      setIsValidating(false);
    }
  }, [schema]);

  // Валидация отдельного поля (для полевой валидации)
  const validateField = useCallback((fieldName, value) => {
    try {
      // Пытаемся распарсить только поле через partial схему
      const partialSchema = schema.pick({ [fieldName]: true });
      const result = partialSchema.safeParse({ [fieldName]: value });
      
      if (result.success) {
        setErrors(prev => prev.filter(e => e.field !== fieldName));
        return { valid: true, value: result.data[fieldName] };
      } else {
        const fieldErrors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        setErrors(prev => {
          const filtered = prev.filter(e => e.field !== fieldName);
          return [...filtered, ...fieldErrors];
        });
        return { valid: false, errors: fieldErrors };
      }
    } catch (error) {
      return { 
        valid: false, 
        errors: [{ field: fieldName, message: error.message || 'Ошибка валидации' }] 
      };
    }
  }, [schema]);

  // Очистка ошибок
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // Очистка ошибки конкретного поля
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => prev.filter(e => e.field !== fieldName));
  }, []);

  // Санитизация объекта данных
  const sanitize = useCallback((obj) => {
    return sanitizeObject(obj);
  }, []);

  // Проверка наличия ошибок
  const hasErrors = errors.length > 0;

  // Получение ошибки для конкретного поля
  const getFieldError = useCallback((fieldName) => {
    return errors.find(e => e.field === fieldName)?.message || null;
  }, [errors]);

  // Получение всех ошибок для конкретного поля
  const getFieldErrors = useCallback((fieldName) => {
    return errors.filter(e => e.field === fieldName).map(e => e.message);
  }, [errors]);

  return {
    // Состояния
    errors,
    isValidating,
    hasErrors,
    
    // Функции валидации
    validate,
    validateField,
    
    // Функции управления ошибками
    clearErrors,
    clearFieldError,
    getFieldError,
    getFieldErrors,
    
    // Утилиты
    sanitize,
  };
};

export default useFormValidation;
