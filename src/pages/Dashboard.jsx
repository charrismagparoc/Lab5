// ─── Dashboard.jsx ────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useWeatherData } from '../context/WeatherContext'
import { useRiskEngine } from '../hooks/useRiskEngine'
import { ZONE_RISK_DATA } from '../data/constants'

const TYPE_COLOR = { Flood:'#5bc0eb', Fire:'#e84855', Landslide:'#f4a35a', Storm:'#f7c541', Earthquake:'#9b72cf' }
const SEV_CLS    = { High:'bd-danger', Medium:'bd-warning', Low:'bd-info' }
const STA_CLS    = { Active:'bd-danger', Pending:'bd-warning', Verified:'bd-info', Responded:'bd-purple', Resolved:'bd-success' }
const TYPES      = ['Flood','Fire','Landslide','Storm','Earthquake']
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Dashboard() {
  const { incidents, alerts, evacCenters, residents, activityLog } = useApp()
  const weather  = useWeatherData()
  const { zoneRisks, highCount, mediumCount, lowCount, overallScore } = useRiskEngine(residents, incidents, weather)
  const [showWeather, setShowWeather] = useState(false)

  const activeInc  = incidents.filter(i => ['Active','Pending'].includes(i.status))
  const incByType  = TYPES.map(t => ({ type:t, count:incidents.filter(i=>i.type===t).length }))
  const maxType    = Math.max(...incByType.map(x=>x.count), 1)
  const totalCap   = evacCenters.reduce((a,c) => a+(c.capacity||0), 0)
  const totalOcc   = evacCenters.reduce((a,c) => a+(c.occupancy||0), 0)
  const alertDanger  = alerts.filter(a=>a.level==='Danger').length
  const alertWarning = alerts.filter(a=>a.level==='Warning').length

  const now = new Date()
  const last7 = Array.from({ length:7 }, (_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-(6-i), 1)
    return {
      label: MONTHS[d.getMonth()],
      count: incidents.filter(inc => {
        if (!inc.dateReported) return false
        const r = new Date(inc.dateReported)
        return r.getMonth()===d.getMonth() && r.getFullYear()===d.getFullYear()
      }).length,
    }
  })
  const maxTrend = Math.max(...last7.map(x=>x.count), 1)

  const overallLabel = overallScore>=70?'HIGH':overallScore>=40?'MEDIUM':'LOW'
  const overallColor = overallScore>=70?'var(--red)':overallScore>=40?'var(--orange)':'var(--green)'

  return (
    <div>

      {/* ── Row 1: Incident + Alerts summary stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:14 }}>
        {[
          { ico:'fa-triangle-exclamation', val:incidents.length,                              lbl:'Total Incidents',    col:'var(--orange)' },
          { ico:'fa-circle-radiation',     val:incidents.filter(i=>i.status==='Active').length, lbl:'Active Incidents',  col:'var(--red)'    },
          { ico:'fa-circle-check',         val:incidents.filter(i=>i.status==='Resolved').length,lbl:'Resolved',         col:'var(--green)'  },
          { ico:'fa-bell',                 val:alerts.length,                                  lbl:'Total Alerts Sent', col:'var(--purple)' },
        ].map(({ ico,val,lbl,col }) => (
          <div key={lbl} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px' }}>
            <div style={{ width:42, height:42, borderRadius:10, background:col+'1a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={'fa-solid '+ico} style={{ color:col, fontSize:18 }}></i>
            </div>
            <div>
              <div style={{ fontSize:26, fontWeight:800, color:col, fontFamily:'var(--disp)', lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11.5, color:'var(--t2)', marginTop:4, fontWeight:500 }}>{lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Alerts breakdown + Evac stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:14 }}>
        {[
          { ico:'fa-circle-radiation', val:alertDanger,  lbl:'Danger Alerts',      col:'var(--red)'    },
          { ico:'fa-triangle-exclamation', val:alertWarning, lbl:'Warning Alerts',  col:'var(--orange)' },
          { ico:'fa-house-flag',       val:evacCenters.filter(c=>c.status==='Open').length, lbl:'Open Centers', col:'var(--green)'  },
          { ico:'fa-person-walking',   val:totalOcc,                                lbl:'Current Evacuees',   col:'var(--blue)'   },
          { ico:'fa-users',            val:residents.length,                        lbl:'Total Residents',     col:'var(--purple)' },
        ].map(({ ico,val,lbl,col }) => (
          <div key={lbl} className="card" style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px' }}>
            <div style={{ width:36, height:36, borderRadius:9, background:col+'1a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={'fa-solid '+ico} style={{ color:col, fontSize:15 }}></i>
            </div>
            <div>
              <div style={{ fontSize:22, fontWeight:800, color:col, fontFamily:'var(--disp)', lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:11, color:'var(--t2)', marginTop:3, fontWeight:500 }}>{lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 3: Active Incidents table + Right column ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:14, marginBottom:14 }}>

        {/* Active Incidents */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ color:'var(--orange)' }}></i>
              <span style={{ fontWeight:700, fontSize:14 }}>Active Incidents</span>
            </div>
            <span className="badge bd-danger">{activeInc.length} Active</span>
          </div>
          {activeInc.length === 0 ? (
            <div className="empty" style={{ padding:30 }}>
              <i className="fa-solid fa-circle-check" style={{ color:'var(--green)', fontSize:28 }}></i>
              <p style={{ marginTop:8, color:'var(--t2)' }}>All clear — no active incidents</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Type & Zone','Location','Severity','Status'].map(h=>(
                    <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:10.5, fontWeight:700,
                      textTransform:'uppercase', letterSpacing:'.6px', color:'var(--t3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeInc.map(inc => (
                  <tr key={inc.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                          background:TYPE_COLOR[inc.type]||'var(--blue)' }}></div>
                        <div>
                          <div style={{ fontWeight:600, fontSize:13 }}>{inc.type}</div>
                          <div style={{ fontSize:11, color:'var(--t3)' }}>{inc.zone}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 16px', fontSize:12.5, color:'var(--t2)' }}>{inc.location||'—'}</td>
                    <td style={{ padding:'10px 16px' }}><span className={'badge '+SEV_CLS[inc.severity]}>{inc.severity}</span></td>
                    <td style={{ padding:'10px 16px' }}><span className={'badge '+STA_CLS[inc.status]}>{inc.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Right: Weather + Zone Risk */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Weather */}
          <div className="card">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <i className="fa-solid fa-cloud-sun-rain" style={{ color:'var(--blue)', fontSize:14 }}></i>
                <span style={{ fontWeight:700, fontSize:13 }}>Live Weather</span>
              </div>
              <button className="btn btn-outline btn-xs" onClick={() => setShowWeather(p=>!p)} type="button">
                {showWeather?'Less':'Details'}
              </button>
            </div>
            <div style={{ fontSize:11, color:'var(--t3)', marginBottom:6 }}>Barangay Kauswagan, CDO</div>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:showWeather?10:0 }}>
              <div style={{ fontSize:34, fontWeight:800, fontFamily:'var(--disp)', color:'var(--t1)' }}>{weather.temperature}°</div>
              <div>
                <i className={'fa-solid '+(weather.icon||'fa-cloud')} style={{ color:'var(--blue)', fontSize:20 }}></i>
                <div style={{ fontSize:12, color:'var(--t2)', marginTop:3 }}>{weather.condition}</div>
              </div>
            </div>
            {showWeather && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6 }}>
                {[
                  ['fa-droplet','Humidity',weather.humidity+'%'],
                  ['fa-wind','Wind',weather.windSpeed+' km/h'],
                  ['fa-cloud-rain','Rain',weather.rainfall1h+' mm'],
                ].map(([ico,lbl,val])=>(
                  <div key={lbl} style={{ background:'var(--bg-el)', borderRadius:8, padding:'7px 8px', textAlign:'center' }}>
                    <i className={'fa-solid '+ico} style={{ color:'var(--blue)', fontSize:12 }}></i>
                    <div style={{ fontSize:11, color:'var(--t3)', margin:'3px 0 1px' }}>{lbl}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'var(--t1)' }}>{val}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone Risk — live from useRiskEngine */}
          <div className="card" style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
              <i className="fa-solid fa-map-pin" style={{ color:'var(--blue)', fontSize:14 }}></i>
              <span style={{ fontWeight:700, fontSize:13 }}>Zone Risk Levels</span>
            </div>
            {zoneRisks.map(z => (
              <div key={z.zone} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                <span style={{ fontSize:11.5, fontWeight:600, width:48, flexShrink:0, color:'var(--t2)' }}>{z.zone}</span>
                <div style={{ flex:1, height:7, background:'var(--bg-el)', borderRadius:4, overflow:'hidden' }}>
                  <div style={{ width:Math.max(z.computedScore,4)+'%', height:'100%', borderRadius:4,
                    background:z.riskColor, transition:'width .4s ease' }}></div>
                </div>
                <span className={'badge '+(z.riskLabel==='HIGH'?'bd-danger':z.riskLabel==='MEDIUM'?'bd-warning':'bd-success')}
                  style={{ minWidth:58, textAlign:'center', fontSize:9.5 }}>
                  {z.riskLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 4: Evac Centers table ── */}
      <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <i className="fa-solid fa-house-flag" style={{ color:'var(--green)' }}></i>
            <span style={{ fontWeight:700, fontSize:14 }}>Evacuation Centers</span>
          </div>
          <div style={{ display:'flex', gap:16 }}>
            {[
              ['Open',evacCenters.filter(c=>c.status==='Open').length,'var(--green)'],
              ['Evacuees',totalOcc,'var(--blue)'],
              ['Remaining',totalCap-totalOcc,'var(--orange)'],
            ].map(([l,v,c])=>(
              <div key={l} style={{ textAlign:'center' }}>
                <div style={{ fontSize:16, fontWeight:800, color:c, fontFamily:'var(--disp)' }}>{v}</div>
                <div style={{ fontSize:10, color:'var(--t3)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {evacCenters.length === 0 ? (
          <div className="empty" style={{ padding:24 }}>
            <p style={{ color:'var(--t2)' }}>No evacuation centers recorded yet.</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ borderBottom:'1px solid var(--border)' }}>
                {['Center Name','Zone','Status','Occupancy / Capacity','Utilization','Facilities'].map(h=>(
                  <th key={h} style={{ padding:'9px 16px', textAlign:'left', fontSize:10.5, fontWeight:700,
                    textTransform:'uppercase', letterSpacing:'.6px', color:'var(--t3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evacCenters.map(c => {
                const pct = c.capacity>0 ? Math.round((c.occupancy/c.capacity)*100) : 0
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 16px', fontWeight:600, fontSize:13 }}>{c.name}</td>
                    <td style={{ padding:'10px 16px', fontSize:12.5, color:'var(--t2)' }}>{c.zone}</td>
                    <td style={{ padding:'10px 16px' }}>
                      <span className={'badge '+(c.status==='Open'?'bd-success':c.status==='Full'?'bd-warning':'bd-neutral')}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ padding:'10px 16px', fontSize:12.5 }}>
                      <strong style={{ color:pct>80?'var(--red)':'var(--t1)' }}>{c.occupancy}</strong>
                      <span style={{ color:'var(--t3)' }}> / {c.capacity}</span>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:72, height:5, background:'var(--bg-el)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:pct+'%', height:'100%', borderRadius:3,
                            background:pct>80?'var(--red)':pct>50?'var(--orange)':'var(--green)',
                            transition:'width .4s' }}></div>
                        </div>
                        <span style={{ fontSize:11, color:'var(--t2)' }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 16px' }}>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {(c.facilitiesAvailable||[]).map(f=>(
                          <span key={f} className="badge bd-info" style={{ fontSize:9 }}>{f}</span>
                        ))}
                        {!(c.facilitiesAvailable||[]).length && <span style={{ color:'var(--t3)', fontSize:11 }}>—</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Row 5: Charts + Activity ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
        {/* Incidents by type */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <i className="fa-solid fa-chart-pie" style={{ color:'var(--blue)', fontSize:14 }}></i>
            <span style={{ fontWeight:700, fontSize:13 }}>Incidents by Type</span>
          </div>
          {incByType.map(({ type, count }) => (
            <div key={type} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
              <span style={{ fontSize:12, color:'var(--t2)', width:76, flexShrink:0 }}>{type}</span>
              <div style={{ flex:1, height:9, background:'var(--bg-el)', borderRadius:4, overflow:'hidden' }}>
                <div style={{ width:(count/maxType*100)+'%', height:'100%', borderRadius:4,
                  background:TYPE_COLOR[type], transition:'width .4s' }}></div>
              </div>
              <span style={{ fontSize:12, fontWeight:700, width:18, textAlign:'right', flexShrink:0 }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Monthly trend */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <i className="fa-solid fa-chart-line" style={{ color:'var(--blue)', fontSize:14 }}></i>
            <span style={{ fontWeight:700, fontSize:13 }}>Monthly Trend</span>
          </div>
          <div className="trend-bars">
            {last7.map(({ label, count }) => (
              <div key={label} className="trend-col">
                <div className="trend-track">
                  <div className="trend-fill" style={{ height:(count===0?3:(count/maxTrend)*100)+'%' }}></div>
                </div>
                <span className="trend-month">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14 }}>
            <i className="fa-solid fa-clock-rotate-left" style={{ color:'var(--blue)', fontSize:14 }}></i>
            <span style={{ fontWeight:700, fontSize:13 }}>Recent Activity</span>
          </div>
          {activityLog.length === 0 ? (
            <div className="empty"><i className="fa-solid fa-clock"></i><p>No activity yet</p></div>
          ) : activityLog.slice(0,6).map((log,i) => (
            <div key={log.id||i} style={{ display:'flex', gap:9, marginBottom:10, alignItems:'flex-start' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', marginTop:5, flexShrink:0,
                background:log.urgent?'var(--red)':'var(--blue)' }}></div>
              <div>
                <div style={{ fontSize:12.5, color:'var(--t1)', lineHeight:1.4 }}>{log.action}</div>
                <div style={{ fontSize:10.5, color:'var(--t3)', marginTop:2 }}>
                  {log.userName} · {log.createdAt
                    ? new Date(log.createdAt).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})
                    : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
