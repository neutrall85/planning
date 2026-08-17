// Custom hook for accessing store context (вынесен для Fast Refresh)
import { useContext } from 'react';
import StoreContext from '../context/StoreContext';

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
