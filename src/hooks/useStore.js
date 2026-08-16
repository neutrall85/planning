import { useContext } from 'react';
import { StoreContext } from '../context/StoreContextConstants';

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
