// src/components/views/JournalView.jsx
import { memo } from 'react';
import Journal from '../Journal';
import { useJournalDb } from '../../hooks/useDb';

function JournalView({ ur }) {
  const db = useJournalDb();
  return <Journal db={db} />;
}

export default memo(JournalView);