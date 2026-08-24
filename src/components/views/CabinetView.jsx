import React from 'react';
import Cabinet from '../Cabinet';

export default function CabinetView({ store, data, user, openTask, openVacation, openDelegation }) {
  return (
    <Cabinet
      store={store}
      data={data}
      user={user}
      openTask={openTask}
      openVacation={openVacation}
      openDelegation={openDelegation}
    />
  );
}