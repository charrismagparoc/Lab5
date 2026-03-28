export default function StatCard({ icon, value, label, color, sub }) {
  return (
    <div className="stat-card">
      <div className="stat-ico" style={{ background: color + '1a' }}>
        <i className={`fa-solid ${icon}`} style={{ color, fontSize: 18 }}></i>
      </div>
      <div>
        <div className="stat-val" style={{ color }}>{value}</div>
        <div className="stat-lbl">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  )
}
