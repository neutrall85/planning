import { useState } from 'react';
import { ModalShell } from '../ModalShell';
import { useDataHelpers } from '../../hooks';
import { VACATION_TYPES } from '../../utils/constants';
import { TODAY, fmtDMY } from '../../utils/date';

export const VacNowModal = ({ db, onClose, toast }) => {
  const [filterDept, setFilterDept] = useState('all');
  const [sort, setSort] = useState('start');
  const { primaryDept, empName } = useDataHelpers(db);

  const rows = db.vacations
    .filter(v => v.status === 'approved' && v.start <= TODAY && TODAY <= v.end)
    .map(v => {
      const e = db.employees.find(x => x.id === v.empId);
      return { v, e, dept: primaryDept(e) };
    })
    .filter(r => filterDept === 'all' || (r.dept && r.dept.id === filterDept))
    .sort((a, b) => (sort === 'start' ? (a.v.start < b.v.start ? -1 : 1) : (a.v.end < b.v.end ? -1 : 1)));

  return (
    <ModalShell title="Сотрудники в отпусках (сейчас)" onClose={onClose} width={880} showSave={false} footer={
      <div className="modal-foot">
        <div className="spacer" />
        <button className="btn ghost" onClick={onClose}>Закрыть</button>
      </div>
    }>
      <div className="toolbar">
        <select className="inp sel sm" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="all">Все подразделения</option>
          {db.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <div className="seg sm">
          <button className={'seg-btn' + (sort === 'start' ? ' on' : '')} onClick={() => setSort('start')}>по началу</button>
          <button className={'seg-btn' + (sort === 'end' ? ' on' : '')} onClick={() => setSort('end')}>по окончанию</button>
        </div>
        <div className="spacer" />
        <button className="btn ghost sm" onClick={() => toast('Список обновлён')}>⟳ Обновить</button>
      </div>
      <table className="tbl">
        <thead><tr><th>ФИО</th><th>Подразделение (основное)</th><th>Начало</th><th>Окончание</th><th>Тип</th><th>Делегирование</th><th>Комментарий</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.v.id}>
              <td><b>{r.e ? `${r.e.last} ${r.e.first}` : '-'}</b></td>
              <td>{r.dept?.name || '-'}</td>
              <td>{fmtDMY(r.v.start)}</td>
              <td>{fmtDMY(r.v.end)}</td>
              <td>{VACATION_TYPES[r.v.type]}</td>
              <td>{r.v.delegation.enabled ? `→ ${empName(r.v.delegation.subId)}` : '-'}</td>
              <td className="mut">{r.v.comment || '-'}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan="7" className="mut">Сейчас никто не находится в отпуске</td></tr>}
        </tbody>
      </table>
    </ModalShell>
  );
};