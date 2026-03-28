export default function RiskBar({ value, max = 100, color, label, showValue = true }) {
  const pct = Math.min(Math.round((value / Math.max(max, 1)) * 100), 100)
  return (
    <div className="risk-bar-wrap">
      {label && <span className="risk-bar-label">{label}</span>}
      <div className="risk-bar-track">
        <div className="risk-bar-fill" style={{ width: `${pct}%`, background: color || 'var(--blue)' }} />
      </div>
      {showValue && <span className="risk-bar-value" style={{ color }}>{value}</span>}
    </div>
  )
}
