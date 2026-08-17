import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import DataStore from '../services/DataStore';

const StoreContext = createContext(null);
export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

export const StoreProvider = ({ children }) => {
  const [store] = useState(() => new DataStore());
  const [data, setData] = useState(store.data);

  useEffect(() => {
    const unsub = store.subscribe((newData) => {
      // Используем функциональное обновление для избежания stale closure
      setData(newData);
    });
    return unsub;
  }, [store]);

  // Мемоизируем функции для предотвращения лишних ре-рендеров
  const login = useCallback((email, password) => store.login(email, password), [store]);
  const logout = useCallback(() => store.logout(), [store]);

  return (
    <StoreContext.Provider value={{ store, data, login, logout }}>
      {children}
    </StoreContext.Provider>
  );
};
