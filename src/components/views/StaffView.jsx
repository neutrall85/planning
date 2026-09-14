import React from 'react';
import Staff from '../Staff';

export default function StaffView({ store, db, ur, setDb, openRoles, openDepts, openVacation }) {
  return (
    <Staff
      store={store}                                      /* ← К1: пробрасываем store в Staff */
      db={db}
      ur={ur}
      setDb={setDb}
      openRoles={openRoles}
      openDepts={openDepts}
      openVacation={openVacation}
    />
  );
}