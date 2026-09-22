// src/components/Tabs.jsx
export const Tabs = ({ tabs, active, onChange, className = '' }) => (
  <div className={`tabs sm ${className}`}>
    {tabs.map(({ id, label, count, badge }) => (
      <button
        key={id}
        className={`tab${active === id ? ' on' : ''}`}
        onClick={() => onChange(id)}
      >
        {label}{count !== undefined && ` (${count})`}
        {badge > 0 && <span className="tab-badge">{badge}</span>}
      </button>
    ))}
  </div>
);