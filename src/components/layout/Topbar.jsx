import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useWeatherData } from '../../context/WeatherContext'
import { useClock } from '../../hooks/useClock'

const PAGE_NAMES = {
  dashboard: 'Dashboard', map: 'GIS Hazard Map', incidents: 'Incidents',
  alerts: 'Alerts', evacuation: 'Evacuation Centers', residents: 'Residents',
  resources: 'Resources', reports: 'Reports', intelligence: 'Risk Intelligence',
  users: 'User Management', activity: 'Activity Log',
}
const LVL_COLOR = { Danger: '#e84855', Warning: '#f4a35a', Advisory: '#5bc0eb', Resolved: '#00d68f' }

export default function Topbar({ activePage, currentUser, onLogout }) {
  const { alerts } = useApp()
  const weather = useWeatherData()
  const { date, time } = useClock()
  const [showNotifs,   setShowNotifs]   = useState(false)
  const [showProfile,  setShowProfile]  = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('idrms-theme') || 'dark')

  const applyTheme = t => {
    setTheme(t)
    localStorage.setItem('idrms-theme', t)
    document.documentElement.setAttribute('data-theme', t)
  }

  const riskCls = `risk-${(weather.riskLevel || 'low').toLowerCase()}`

  return (
    <header className="topbar">
      <div className="t-left">
        <i className="fa-solid fa-chevron-right t-crumb-icon"></i>
        <span className="t-page-name">{PAGE_NAMES[activePage] || 'Dashboard'}</span>

        {weather.isSunny && (
          <div className="sunny-chip">
            <i className="fa-solid fa-sun"></i>
            Sunny Day
          </div>
        )}

        <div className="t-weather">
          <i className={`fa-solid ${weather.icon || 'fa-cloud'}`}></i>
          <span>{weather.condition}</span>
          <strong>{weather.temp}°C</strong>
          <i className="fa-solid fa-wind"></i>
          <span>{weather.windKph} km/h</span>
          <span className="t-humidity">{weather.humidity}%</span>
          <div className={`risk-chip ${riskCls}`}>{weather.riskLevel}</div>
        </div>
      </div>

      <div className="t-right">
        <div className="t-clock">
          <div className="t-date">{date}</div>
          <div className="t-time">{time}</div>
        </div>

        <button className="icon-btn" onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme" type="button">
          <i className={`fa-solid ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
        </button>

        <div className="t-notif-wrap">
          <button className="icon-btn" onClick={() => { setShowNotifs(p => !p); setShowProfile(false) }} type="button" aria-label="Notifications">
            <i className="fa-solid fa-bell"></i>
            {alerts.length > 0 && <span className="notif-badge">{Math.min(alerts.length, 9)}</span>}
          </button>
          {showNotifs && (
            <>
              <div className="t-overlay" onClick={() => setShowNotifs(false)} />
              <div className="t-dropdown notif-dropdown">
                <div className="t-dropdown-hdr">
                  <strong>Active Alerts</strong>
                  <span className="badge bd-danger">{alerts.length}</span>
                </div>
                {alerts.slice(0, 6).map(a => (
                  <div key={a.id} className="notif-item">
                    <div className="notif-dot" style={{ background: LVL_COLOR[a.level] || '#888' }} />
                    <div>
                      <div className="notif-level" style={{ color: LVL_COLOR[a.level] || '#888' }}>{a.level}</div>
                      <div className="notif-msg">{(a.message || a.title || '').slice(0, 70)}</div>
                      <div className="notif-zone">{a.zone}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="t-profile-wrap">
          <button className="profile-btn" onClick={() => { setShowProfile(p => !p); setShowNotifs(false) }} type="button">
            <div className="p-avatar">{(currentUser?.name || 'A')[0].toUpperCase()}</div>
            <div className="p-info">
              <div className="p-name">{currentUser?.name}</div>
              <div className="p-role">{currentUser?.role}</div>
            </div>
            <i className="fa-solid fa-chevron-down p-chevron"></i>
          </button>
          {showProfile && (
            <>
              <div className="t-overlay" onClick={() => setShowProfile(false)} />
              <div className="t-dropdown profile-dropdown">
                <div className="t-dropdown-hdr profile-hdr">
                  <strong>{currentUser?.name}</strong>
                  <span>{currentUser?.email}</span>
                </div>
                <div className="t-dropdown-body">
                  <button className="t-menu-btn" onClick={() => { setShowProfile(false); setShowSettings(true) }} type="button">
                    <i className="fa-solid fa-gear"></i> Settings
                  </button>
                  <div className="t-divider" />
                  <button className="t-menu-btn t-menu-btn-danger" onClick={onLogout} type="button">
                    <i className="fa-solid fa-right-from-bracket"></i> Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-gear" style={{ color: 'var(--blue)', marginRight: 8 }}></i>Settings</h3>
              <button className="modal-close" onClick={() => setShowSettings(false)} type="button">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="settings-section-lbl">Appearance</div>
            <div className="settings-row">
              <div>
                <strong>Dark Mode</strong>
                <div className="settings-row-sub">Toggle dark / light interface</div>
              </div>
              <button className={`btn btn-sm ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')} type="button">
                <i className={`fa-solid ${theme === 'dark' ? 'fa-moon' : 'fa-sun'}`}></i>
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>
            <div className="settings-section-lbl">System Info</div>
            {[
              ['Version',  'IDRMS v3.0.0'],
              ['Database', 'Django'],
              ['Weather',  weather.source === 'live' ? 'OpenWeatherMap (Live)' : 'Fallback data'],
              ['Location', 'Brgy. Kauswagan, CDO'],
            ].map(([k, v]) => (
              <div key={k} className="settings-info-row">
                <span>{k}</span>
                <span className="settings-info-val">{v}</span>
              </div>
            ))}
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={() => setShowSettings(false)} type="button">Close</button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
