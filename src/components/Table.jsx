import React from 'react';

export const Table = ({ columns, data, renderRow, emptyMessage = 'Нет данных' }) => (
  <table className="tbl">
    <thead><tr>{columns.map((col, i) => <th key={i}>{col}</th>)}</tr></thead>
    <tbody>
      {data.length ? data.map(renderRow) : <tr><td colSpan={columns.length} className="mut">{emptyMessage}</td></tr>}
    </tbody>
  </table>
);