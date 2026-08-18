import { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import DataStore from '../services/DataStore';
import type { StoreData } from '../types';

/**
 * Интерфейс контекста данных
 */
interface DataContextType {
  store: DataStore;
  data: StoreData;
}

/**
 * Пропсы провайдера данных
 */
interface DataProviderProps {
  children: ReactNode;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: DataProviderProps) => {
  const [store] = useState(() => new DataStore());
  const [data, setData] = useState<StoreData>(store.data);

  useEffect(() => {
    const unsub = store.subscribe((newData: StoreData) => {
      // Используем функциональное обновление для избежания stale closure
      setData(newData);
    });
    return unsub;
  }, [store]);

  return (
    <DataContext.Provider value={{ store, data }}>
      {children}
    </DataContext.Provider>
  );
};

export type { DataContextType };
export default DataContext;
