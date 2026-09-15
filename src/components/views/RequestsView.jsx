import Requests from '../Requests';

export default function RequestsView({
  db,
  setDb,
  ur,
  addAudit,
  notifyVacationDecision,
  notifyRoleDelegationDecision,
  notifyHoursRequestDecision,
}) {
  return (
    <Requests
      db={db}
      setDb={setDb}
      ur={ur}
      initialTab="hours"
      addAudit={addAudit}
      notifyVacationDecision={notifyVacationDecision}
      notifyRoleDelegationDecision={notifyRoleDelegationDecision}
      notifyHoursRequestDecision={notifyHoursRequestDecision}
    />
  );
}