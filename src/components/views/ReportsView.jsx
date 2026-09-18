// src/components/views/ReportsView.jsx
import { memo } from 'react';
import Reports from '../Reports';
import { useReportsDb } from '../../hooks/useDb';

function ReportsView({ ur }) {
  const db = useReportsDb();
  return <Reports db={db} ur={ur} />;
}

export default memo(ReportsView);