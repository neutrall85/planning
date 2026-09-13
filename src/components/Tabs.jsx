export const Tabs = ({ tabs, active, onChange, className = '' }) => (
  <div className={`tabs sm ${className}`}>
    {tabs.map(({ id, label, count }) => (
      <button
        key={id}
        className={`tab${active === id ? ' on' : ''}`}
        onClick={() => onChange(id)}
      >
        {label}{count !== undefined && ` (${count})`}
      </button>
    ))}
  </div>
);