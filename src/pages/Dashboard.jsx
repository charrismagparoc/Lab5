// ─── Dashboard.jsx ────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useWeatherData } from '../context/WeatherContext'
import { ZONE_RISK_DATA } from '../data/constants'

const TYPE_COLOR = { Flood:'#5bc0eb', Fire:'#e84855', Landslide:'#f4a35a', Storm:'#f7c541', Earthquake:'#9b72cf' }
const SEV_CLS = { High:'bd-danger', Medium:'bd-warning', Low:'bd-info' }
const STA_CLS = { Active:'bd-danger', Pending:'bd-warning', Verified:'bd-info', Responded:'bd-purple', Resolved:'bd-success' }
const TYPES = ['Flood','Fire','Landslide','Storm','Earthquake']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function StatCard({ icon, value, label, cls }) {
  return (
    <div className={'stat-card sc-' + cls}>
      <div className="stat-ico"><i className={'fa-solid ' + icon}></i></div>
      <div><div className="stat-val">{value}</div><div className="stat-lbl">{label}</div></div>
    </div>
  )
}

export default function Dashboard() {
  const { incidents, alerts, evacCenters, residents, activityLog } = useApp()
  const weather = useWeatherData()
  const [showWeather, setShowWeather] = useState(false)

  const activeInc = incidents.filter(i => ['Active','Pending'].includes(i.status))
  const incByType = TYPES.map(t => ({ type: t, count: incidents.filter(i => i.type === t).length }))
  const maxType   = Math.max(...incByType.map(x => x.count), 1)

  const now = new Date()
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1)
    return {
      label: MONTHS[d.getMonth()],
      count: incidents.filter(inc => {
        if (!inc.dateReported) return false
        const r = new Date(inc.dateReported)
        return r.getMonth() === d.getMonth() && r.getFullYear() === d.getFullYear()
      }).length,
    }
  })
  const maxTrend = Math.max(...last7.map(x => x.count), 1)

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        <StatCard icon="fa-triangle-exclamation" value={incidents.length}                                              label="Total Incidents"     cls="orange" />
        <StatCard icon="fa-circle-radiation"     value={incidents.filter(i=>i.status==='Active').length}              label="Active Emergencies"  cls="red"    />
        <StatCard icon="fa-circle-check"         value={incidents.filter(i=>i.status==='Resolved').length}            label="Resolved"            cls="green"  />
        <StatCard icon="fa-person-walking"       value={residents.filter(r=>r.evacuationStatus==='Evacuated').length} label="Evacuated Residents" cls="blue"   />
        <StatCard icon="fa-users"                value={residents.length}                                             label="Total Residents"     cls="purple" />
        <StatCard icon="fa-house-flag"           value={evacCenters.filter(c=>c.status==='Open').length}              label="Open Evac Centers"   cls="yellow" />
      </div>

      {/* Main row */}
      <div className="dash-row">
        {/* Active incidents */}
        <div className="card">
          <div className="sec-title">
            <i className="fa-solid fa-triangle-exclamation"></i> Active Incidents
            <span className="badge bd-danger dash-badge-right">{activeInc.length} Active</span>
          </div>
          {activeInc.length === 0 ? (
            <div className="empty">
              <i className="fa-solid fa-circle-check dash-clear-icon"></i>
              <p>All clear — no active incidents</p>
            </div>
          ) : activeInc.map(inc => (
            <div key={inc.id} className="inc-row">
              <div className="inc-dot" style={{ background: TYPE_COLOR[inc.type] || 'var(--blue)' }}></div>
              <div className="inc-info">
                <div className="inc-zone">{inc.type} — {inc.zone}</div>
                <div className="inc-loc">{inc.location || '—'}</div>
              </div>
              <span className={'badge ' + SEV_CLS[inc.severity]}>{inc.severity}</span>
              <span className={'badge ' + STA_CLS[inc.status]}>{inc.status}</span>
            </div>
          ))}
        </div>

        {/* Right column */}
        <div className="dash-right-col">
          {/* Weather */}
          <div className="card">
            <div className="sec-title">
              <i className="fa-solid fa-cloud-sun-rain"></i> Live Weather
              <button className="btn btn-outline btn-sm dash-badge-right" onClick={() => setShowWeather(p => !p)} type="button">
                {showWeather ? 'Less' : 'Details'}
              </button>
            </div>
            <div className="weather-loc">Barangay Kauswagan, CDO</div>
            <div className="weather-main">
              <div className="w-temp">{weather.temperature}°</div>
              <div className="w-cond">
                <i className={'fa-solid ' + (weather.icon || 'fa-cloud') + ' w-icon'}></i>
                <span className="w-cond-text">{weather.condition}</span>
              </div>
            </div>
            {showWeather && (
              <div className="w-stats">
                <div className="w-stat"><i className="fa-solid fa-droplet ic-blue"></i><span>Humidity</span><strong>{weather.humidity}%</strong></div>
                <div className="w-stat"><i className="fa-solid fa-wind ic-blue"></i><span>Wind</span><strong>{weather.windSpeed} km/h</strong></div>
                <div className="w-stat"><i className="fa-solid fa-cloud-rain ic-blue"></i><span>Rain (1h)</span><strong>{weather.rainfall1h} mm</strong></div>
              </div>
            )}
          </div>

          {/* Zone risk */}
          <div className="card">
            <div className="sec-title"><i className="fa-solid fa-map-pin"></i> Zone Risk Levels</div>
            {ZONE_RISK_DATA.map(z => {
              const incCount = incidents.filter(i => i.zone === z.zone).length
              const pct = Math.max(Math.min((incCount / Math.max(incidents.length, 1)) * 200, 100), 8)
              return (
                <div key={z.zone} className="zone-row">
                  <span className="zone-name">{z.zone}</span>
                  <div className="zone-bar-bg">
                    <div className={'zone-bar-f zone-' + z.riskLevel.toLowerCase()} style={{ width: pct + '%' }}></div>
                  </div>
                  <span className={'badge ' + (z.riskLevel==='High'?'bd-danger':z.riskLevel==='Medium'?'bd-warning':'bd-success')}>{z.riskLevel}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="dash-bot">
        {/* By type */}
        <div className="card">
          <div className="sec-title"><i className="fa-solid fa-chart-pie"></i> Incidents by Type</div>
          {incByType.map(({ type, count }) => (
            <div key={type} className="type-bar-row">
              <span className="type-lbl">{type}</span>
              <div className="type-track">
                <div className="type-fill" style={{ width: (count / maxType * 100) + '%', background: TYPE_COLOR[type] }}></div>
              </div>
              <span className="type-cnt">{count}</span>
            </div>
          ))}
        </div>

        {/* Trend */}
        <div className="card">
          <div className="sec-title"><i className="fa-solid fa-chart-line"></i> Monthly Trend</div>
          <div className="trend-bars">
            {last7.map(({ label, count }) => (
              <div key={label} className="trend-col">
                <div className="trend-track">
                  <div className="trend-fill" style={{ height: (count === 0 ? 3 : (count / maxTrend) * 100) + '%' }}></div>
                </div>
                <span className="trend-month">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div className="card">
          <div className="sec-title"><i className="fa-solid fa-clock-rotate-left"></i> Recent Activity</div>
          {activityLog.length === 0 ? (
            <div className="empty"><i className="fa-solid fa-clock"></i><p>No activity yet</p></div>
          ) : activityLog.slice(0, 6).map((log, i) => (
            <div key={log.id || i} className="activity-item">
              <div className="act-dot" style={{ background: log.urgent ? 'var(--red)' : 'var(--blue)' }}></div>
              <div>
                <div className="act-action">{log.action}</div>
                <div className="act-meta">{log.userName} · {log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}) : '—'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
