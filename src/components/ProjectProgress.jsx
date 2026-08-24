// components/ProjectProgress.jsx
import React from 'react';
import { getProjectColor } from '../utils/projectHelpers';

export default function ProjectProgress({ project, plan, fact }) {
  const budget = project?.budget;
  if (budget == null) return null; // для админ-проектов без бюджета ничего не показываем

  const usePct = Math.round((fact / Math.max(1, budget)) * 100);
  const overPlan = plan > budget;
  const color = getProjectColor(project);

  return (
    <div className="pj-budget">
      <div className="pj-budget-row">
        <span>Бюджет: <b>{budget} ч</b></span>
        <span>План: <b className={overPlan ? 'red' : ''}>{plan} ч</b></span>
        <span>Факт: <b>{fact} ч</b></span>
        <span>Использовано: <b>{usePct}%</b></span>
      </div>
      <div className="pj-progress">
        <div
          className={`pj-progress-fill${usePct > 100 ? ' over' : ''}`}
          style={{ width: Math.min(100, usePct) + '%', background: color }}
        />
      </div>
    </div>
  );
}