const MENU = [
  { id: 'dashboard',    label: 'Dashboard',          icon: 'fa-gauge-high',           grad: 'linear-gradient(135deg,#5bc0eb,#3a91b8)' },
  { id: 'map',          label: 'GIS Hazard Map',     icon: 'fa-map-location-dot',     grad: 'linear-gradient(135deg,#00d68f,#009d6a)' },
  { id: 'incidents',    label: 'Incidents',          icon: 'fa-triangle-exclamation', grad: 'linear-gradient(135deg,#f4a35a,#c97a2e)' },
  { id: 'alerts',       label: 'Alerts',             icon: 'fa-bell',                 grad: 'linear-gradient(135deg,#e84855,#b5303a)' },
  { id: 'evacuation',   label: 'Evacuation Centers', icon: 'fa-house-flag',           grad: 'linear-gradient(135deg,#f7c541,#c99010)' },
  { id: 'residents',    label: 'Residents',          icon: 'fa-users',                grad: 'linear-gradient(135deg,#9b72cf,#7050a8)' },
  { id: 'resources',    label: 'Resources',          icon: 'fa-boxes-stacked',        grad: 'linear-gradient(135deg,#00d68f,#009d6a)' },
  { id: 'reports',      label: 'Reports',            icon: 'fa-chart-line',           grad: 'linear-gradient(135deg,#5bc0eb,#3a91b8)' },
  { id: 'intelligence', label: 'Risk Intelligence',  icon: 'fa-brain',                grad: 'linear-gradient(135deg,#c9b8f0,#9b72cf)' },
]
const SYS = [
  { id: 'users',    label: 'User Management', icon: 'fa-user-gear',         grad: 'linear-gradient(135deg,#7e8ea6,#5a6880)' },
  { id: 'activity', label: 'Activity Log',    icon: 'fa-clock-rotate-left', grad: 'linear-gradient(135deg,#7e8ea6,#5a6880)' },
]

export default function Sidebar({ activePage, setActivePage, currentUser }) {
  const navigate = (id) => {
    setActivePage(id)
    window.location.hash = id
  }

  return (
    <nav className="sidebar">
      <div className="s-head">
        <div className="s-logo">
          <i className="fa-solid fa-shield-heart"></i>
        </div>
        <div>
          <div className="s-name">IDRMS</div>
          <div className="s-sub">BRGY. KAUSWAGAN</div>
        </div>
      </div>

      <div className="s-section">
        <div className="s-section-lbl">Main Menu</div>
        {MENU.map(m => (
          <button
            key={m.id}
            className={'nav-btn' + (activePage === m.id ? ' active' : '')}
            onClick={() => navigate(m.id)}
            type="button"
            aria-current={activePage === m.id ? 'page' : undefined}
          >
            <div className="nav-ico" style={{ background: m.grad }}>
              <i className={`fa-solid ${m.icon}`}></i>
            </div>
            <span className="nav-lbl">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="s-section">
        <div className="s-section-lbl">System</div>
        {SYS.map(m => (
          <button
            key={m.id}
            className={'nav-btn' + (activePage === m.id ? ' active' : '')}
            onClick={() => navigate(m.id)}
            type="button"
            aria-current={activePage === m.id ? 'page' : undefined}
          >
            <div className="nav-ico" style={{ background: m.grad }}>
              <i className={`fa-solid ${m.icon}`}></i>
            </div>
            <span className="nav-lbl">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="s-foot">
        <div className="s-foot-label">Logged in as</div>
        <div className="s-user-name">{currentUser?.name}</div>
        <div className="s-user-role">{currentUser?.role}</div>
        <div className="s-db-ok">
        </div>
      </div>
    </nav>
  )
}
