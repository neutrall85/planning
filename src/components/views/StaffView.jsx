// src/components/views/StaffView.jsx
import { memo } from 'react';
import Staff from '../Staff';
import { useStaffDb } from '../../hooks/useDb';

function StaffView({
  store, ur, openRoles, openDepts, openVacation,
}) {
  const db = useStaffDb();

  return (
    <Staff
      store={store}
      db={db}
      ur={ur}
      setDb={store.setDb}
      openRoles={openRoles}
      openDepts={openDepts}
      openVacation={openVacation}
    />
  );
}

export default memo(StaffView);