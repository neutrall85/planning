import { useState, useEffect } from 'react';
import { useStore } from './useStore';

export const useAuth = () => {
  const { store } = useStore();
  const [user, setUser] = useState(store.getCurrentUser() || null);

  useEffect(() => {
    const checkUser = () => {
      const currentUser = store.getCurrentUser() || null;
      if (currentUser !== user) {
        setUser(currentUser);
      }
    };
    const unsubscribe = store.subscribe(checkUser);
    return unsubscribe;
  }, [store, user]);

  const roles = user ? user.roles : [];
  const hasRole = (role) => roles.includes(role);
  const hasAnyRole = (...rs) => rs.some(r => roles.includes(r));
  return { user, roles, hasRole, hasAnyRole };
};