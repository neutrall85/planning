import { useState, useEffect } from 'react';
import DataStore from '../services/DataStore';
import { StoreContext } from './StoreContextConstants';

export const StoreProvider = ({ children }) => {
  const [store] = useState(() => new DataStore());
  const [data, setData] = useState(store.data);
  
  useEffect(() => {
    const unsub = store.subscribe((newData) => {
      setData(newData);
    });
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
