import { useState, useEffect, useCallback } from 'react';
import { useStore } from './useStore';

export const useAuth = () => {
  const { store } = useStore();
  const [user, setUser] = useState(store.getCurrentUser() || null);
  
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
  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (...rs) => rs.some(r => roles.includes(r));
  return { user, roles, hasRole, hasAnyRole };
};
