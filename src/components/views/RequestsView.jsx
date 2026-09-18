// src/components/views/RequestsView.jsx
import { memo } from 'react';
import Requests from '../Requests';
import { useRequestsDb } from '../../hooks/useDb';

function RequestsView({ ur }) {
  const db = useRequestsDb();
  return <Requests db={db} ur={ur} initialTab="hours" />;
}

export default memo(RequestsView);