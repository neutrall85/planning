import React from 'react';
import Requests from '../Requests';

export default function RequestsView({ db, setDb, ur, addAudit }) {
  return <Requests db={db} setDb={setDb} ur={ur} initialTab="hours" addAudit={addAudit} />;
}