import { createContext, useContext, useState, useEffect } from 'react';
import dataStore from '../services/DataStore'; // импортируем готовый экземпляр

const StoreContext = createContext(null);

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};

export const StoreProvider = ({ children }) => {
  // Используем уже существующий инстанс, не создаём новый
  const [store] = useState(() => dataStore);
  const [data, setData] = useState(store.data);

  useEffect(() => {
    const unsub = store.subscribe(newData => setData(newData));
    return unsub;
  }, [store]);

  const login = (email, password) => store.login(email, password);
  const logout = () => store.logout();

  return (
    <StoreContext.Provider value={{ store, data, login, logout }}>
      {children}
    </StoreContext.Provider>
  );
};