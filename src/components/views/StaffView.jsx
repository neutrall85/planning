import React from 'react';
import Staff from '../Staff';

export default function StaffView({ db, ur, setDb, openRoles, openDepts, openVacation }) {
  return (
    <Staff
      db={db}
      ur={ur}
      setDb={setDb}
      openRoles={openRoles}
      openDepts={openDepts}
      openVacation={openVacation}
    />
  );
}