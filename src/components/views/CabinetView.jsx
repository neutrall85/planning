// src/components/views/CabinetView.jsx
import { memo } from 'react';
import Cabinet from '../Cabinet';
import { useCabinetDb } from '../../hooks/useDb';

function CabinetView({
  store, user, openTask, openVacation, openDelegation, openEmployeeTasks,
}) {
  const data = useCabinetDb();

  return (
    <Cabinet
      store={store}
      data={data}
      user={user}
      openTask={openTask}
      openVacation={openVacation}
      openDelegation={openDelegation}
      openEmployeeTasks={openEmployeeTasks}
    />
  );
}

export default memo(CabinetView);