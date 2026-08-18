import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import DataStore from '../services/DataStore';
import type { StoreData } from '../types';

interface StoreContextType {
  store: DataStore;
  data: StoreData;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

interface StoreProviderProps {
  children: ReactNode;
}

export const StoreProvider = ({ children }: StoreProviderProps) => {
  const [store] = useState(() => new DataStore());
  const [data, setData] = useState<StoreData>(store.data);

  useEffect(() => {
    const unsub = store.subscribe((newData: StoreData) => {
      // Используем функциональное обновление для избежания stale closure
      setData(newData);
    });
    return unsub;
  }, [store]);

  // Мемоизируем функции для предотвращения лишних ре-рендеров
  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await store.login(email, password);
      return result;
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      };
    }
  }, [store]);
  
  const logout = useCallback(() => {
    store.logout();
  }, [store]);

  return (
    <StoreContext.Provider value={{ store, data, login, logout }}>
      {children}
    </StoreContext.Provider>
  );
};

export default StoreContext;
export type { StoreContextType };
