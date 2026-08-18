import { useContext } from 'react';
import DataContext, { type DataContextType } from '../context/DataContext';

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx as DataContextType;
};
