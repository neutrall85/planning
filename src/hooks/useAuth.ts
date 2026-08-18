import { useState, useEffect, useCallback } from 'react';
import { useStore } from './useStore';
import type { Employee } from '../types';

export const useAuth = () => {
  const { store } = useStore();
  const [user, setUser] = useState<Employee | null>(store.getCurrentUser() || null);
  
  // Используем useCallback для стабильной ссылки на функцию
  const checkUser = useCallback(() => {
    const currentUser = store.getCurrentUser() || null;
    setUser(currentUser);
  }, [store]);

  useEffect(() => {
    // Подписываемся при маунте
    const unsubscribe = store.subscribe(checkUser);
    // Очищаем подписку при анмаунте или изменении store
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [store, checkUser]);

  const roles = user ? user.roles : [];
  const hasRole = (role: string) => roles.includes(role as any);
  const hasAnyRole = (...rs: string[]) => rs.some(r => roles.includes(r as any));
  return { user, roles, hasRole, hasAnyRole };
};
