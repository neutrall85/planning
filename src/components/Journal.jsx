import React from 'react';
import { fmtDT } from '../utils/date';

export default function Journal({ db, ur }) {
  return (
    <div className="rep-panel">
      <div className="rep-panel-title">Системный журнал</div>
      <table className="tbl">
        <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th></tr></thead>
        <tbody>{db.audit.map(a => <tr key={a.id}><td className="mut">{fmtDT(a.ts)}</td><td>{a.userId === 'system' ? 'Система' : db.employees.find(e=>e.id===a.userId)?.last || '—'}</td><td><b>{a.action}</b></td></tr>)}</tbody>
      </table>
    </div>
  );
}