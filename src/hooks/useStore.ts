import { useContext } from 'react';
import StoreContext, { type StoreContextType } from '../context/StoreContext';

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx as StoreContextType;
};
