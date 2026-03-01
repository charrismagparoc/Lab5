import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useWeatherData } from '../context/WeatherContext'
import { useRiskEngine } from '../hooks/useRiskEngine'
import { ZONES } from '../data/constants'

const FACTOR_INFO = [
  { key:'zone',    label:'Zone Base Risk',      icon:'fa-map-pin',    desc:'Historical flood/landslide hazard rating for each zone', color:'var(--blue)',   max:82 },
  { key:'vuln',    label:'Vulnerability Score', icon:'fa-heart-pulse', desc:'Weighted score: Bedridden(12), PWD(10), Senior(8), Pregnant(8), Infant(7)', color:'var(--purple)', max:40 },
  { key:'evac',    label:'Evacuation Status',   icon:'fa-person-walking-arrow-right', desc:'Unaccounted adds 18 pts, Evacuated subtracts 15 pts', color:'var(--orange)', max:18 },
  { key:'hh',      label:'Household Size',      icon:'fa-users',      desc:'Larger households are harder to evacuate (+1.8/member, max 12)', color:'var(--yellow)', max:12 },
  { key:'inc',     label:'Local Incidents',     icon:'fa-triangle-exclamation', desc:'Recent incidents in the zone multiply risk (+6/incident, max 20)', color:'var(--red)', max:20 },
  { key:'weather', label:'Weather Modifier',    icon:'fa-cloud-bolt', desc:'High weather risk adds 15 pts, Medium adds 7 pts', color:'var(--blue)',   max:15 },
  { key:'season',  label:'Rainy Season Bonus',  icon:'fa-umbrella',   desc:'June–November typhoon season adds 8 points to all scores', color:'var(--blue)', max:8 },
]

function ScoreGauge({ score, color, size = 90 }) {
  const radius    = (size / 2) - 8
  const circ      = 2 * Math.PI * radius
  const dashOffset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-el)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: 16, fontWeight: 800, transform: 'rotate(90deg)', transformOrigin: 'center', fontFamily: 'var(--disp)' }}>
        {score}
      </text>
    </svg>
  )
}

function RiskBar({ label, value, max, color, desc }) {
  const pct = Math.min(Math.round((value / max) * 100), 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{value} / {max} pts</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-el)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width .4s ease' }} />
      </div>
      {desc && <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>{desc}</div>}
    </div>
  )
}

export default function RiskIntelligencePage() {
  const { incidents, residents, evacCenters } = useApp()
  const weather = useWeatherData()
  const { residentRisks, zoneRisks, highCount, mediumCount, lowCount, overallScore, isRainySeason } = useRiskEngine(residents, incidents, weather)

  const [tab,         setTab]         = useState('overview')
  const [filterZone,  setFilterZone]  = useState('All')
  const [filterLevel, setFilterLevel] = useState('All')
  const [search,      setSearch]      = useState('')
  const [expandZone,  setExpandZone]  = useState(null)

  const shownResidents = residentRisks.filter(r => {
    const mz = filterZone  === 'All' || r.zone      === filterZone
    const ml = filterLevel === 'All' || r.riskLabel === filterLevel
    const mq = (r.name||'').toLowerCase().includes(search.toLowerCase())
    return mz && ml && mq
  })

  const riskColor = score =>
    score >= 70 ? 'var(--red)' : score >= 40 ? 'var(--orange)' : 'var(--green)'

  const overallColor = riskColor(overallScore)

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Risk Intelligence</div>
          <div className="page-sub">
            AI-powered multi-factor risk scoring · Weighted model similar to logistic regression
            {isRainySeason && <span className="badge bd-warning" style={{ marginLeft: 10, fontSize: 10 }}>🌧 Rainy Season Active</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-inp)', border: '1px solid var(--border)', borderRadius: 9 }}>
          <i className={'fa-solid ' + (weather.icon||'fa-cloud')} style={{ color: 'var(--blue)' }}></i>
          <span style={{ fontSize: 12, color: 'var(--t2)' }}>Weather:</span>
          <span className={`risk-chip risk-${(weather.riskLevel||'low').toLowerCase()}`}>{weather.riskLevel}</span>
          <span style={{ fontSize: 11, color: 'var(--t3)' }}>{weather.temp}°C · {weather.windKph} km/h</span>
        </div>
      </div>

      {/* ML Model explanation */}
      <div className="ml-model-note">
        <strong>🤖 How the Risk Score Works</strong> — This model uses a <strong>weighted additive scoring algorithm</strong> (inspired by logistic regression).
        Each resident gets a score from 0–100 based on 7 factors below. Zones are scored by aggregating resident data plus active incident counts.
        The model runs in real-time and updates as new incidents, alerts, and resident data are added.
      </div>

      {/* Top KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* Overall score gauge */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>Overall Risk</div>
          <ScoreGauge score={overallScore} color={overallColor} size={100} />
          <span className={`risk-chip risk-${overallScore>=70?'high':overallScore>=40?'medium':'low'}`}>
            {overallScore >= 70 ? 'HIGH' : overallScore >= 40 ? 'MEDIUM' : 'LOW'}
          </span>
        </div>
        {/* KPI cards */}
        {[
          ['High Risk',    highCount,    'var(--red)',    'fa-triangle-exclamation', 'Residents scoring 70+'],
          ['Medium Risk',  mediumCount,  'var(--orange)', 'fa-circle-exclamation',   'Residents scoring 40–69'],
          ['Low Risk',     lowCount,     'var(--green)',  'fa-circle-check',          'Residents scoring 0–39'],
          ['Unaccounted',  residents.filter(r=>r.evacuationStatus==='Unaccounted').length, 'var(--yellow)', 'fa-person-circle-question', 'Evacuation status unknown'],
        ].map(([l,v,c,ico,sub])=>(
          <div key={l} className="stat-card" style={{ borderColor: c + '22' }}>
            <div className="stat-ico" style={{ background: c + '1a' }}>
              <i className={`fa-solid ${ico}`} style={{ color: c, fontSize: 18 }}></i>
            </div>
            <div>
              <div className="stat-val" style={{ color: c }}>{v}</div>
              <div className="stat-lbl">{l}</div>
              <div style={{ fontSize: 10.5, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
        {[
          ['overview',   'fa-chart-pie',   'Overview & Model'],
          ['zones',      'fa-map-pin',     'Zone Analysis'],
          ['residents',  'fa-users',       'Resident Risk Scores'],
        ].map(([k,ico,lbl])=>(
          <button key={k} type="button"
            className={'btn btn-sm '+(tab===k?'btn-primary':'btn-secondary')}
            onClick={()=>setTab(k)}>
            <i className={'fa-solid '+ico}></i> {lbl}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Model factors */}
          <div className="card">
            <div className="sec-title"><i className="fa-solid fa-sliders"></i> Scoring Factors (Max 100 pts)</div>
            {FACTOR_INFO.map(f => (
              <div key={f.key} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                  <i className={`fa-solid ${f.icon}`} style={{ color: f.color, fontSize: 12 }}></i>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{f.label}</span>
                  <span style={{ fontSize: 11, color: f.color, marginLeft: 'auto', fontWeight: 700 }}>max {f.max} pts</span>
                </div>
                <div style={{ height: 5, background: 'var(--bg-el)', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{ width: `${(f.max/82)*100}%`, height: '100%', background: f.color + 'cc', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* Distribution chart + current conditions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card">
              <div className="sec-title"><i className="fa-solid fa-chart-bar"></i> Risk Distribution</div>
              {[
                ['HIGH',   highCount,   residentRisks.length, 'var(--red)'],
                ['MEDIUM', mediumCount, residentRisks.length, 'var(--orange)'],
                ['LOW',    lowCount,    residentRisks.length, 'var(--green)'],
              ].map(([lbl,count,total,color])=>{
                const pct = total > 0 ? Math.round((count/total)*100) : 0
                return (
                  <div key={lbl} style={{ marginBottom: 12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
                      <span className={`badge bd-${lbl==='HIGH'?'danger':lbl==='MEDIUM'?'warning':'success'}`}>{lbl}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color }}>{count} residents ({pct}%)</span>
                    </div>
                    <div style={{ height: 12, background:'var(--bg-el)', borderRadius: 6, overflow:'hidden' }}>
                      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:6, transition:'width .5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card">
              <div className="sec-title"><i className="fa-solid fa-cloud-bolt"></i> Current Conditions (Live Modifiers)</div>
              {[
                ['Weather Risk',      weather.riskLevel,                           weather.riskLevel==='High'?'var(--red)':weather.riskLevel==='Medium'?'var(--orange)':'var(--green)'],
                ['Temperature',       weather.temp + '°C',                         'var(--blue)'],
                ['Wind Speed',        weather.windKph + ' km/h',                   'var(--blue)'],
                ['Humidity',          weather.humidity + '%',                       'var(--blue)'],
                ['Rainy Season',      isRainySeason ? 'Yes (+8 pts)' : 'No',       isRainySeason ? 'var(--orange)' : 'var(--green)'],
                ['Active Incidents',  incidents.filter(i=>['Active','Pending'].includes(i.status)).length + ' total', 'var(--red)'],
                ['Evac Centers Open', evacCenters.filter(c=>c.status==='Open').length + ' / ' + evacCenters.length, 'var(--green)'],
              ].map(([l,v,c])=>(
                <div key={l} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:12.5 }}>
                  <span style={{ color:'var(--t2)' }}>{l}</span>
                  <strong style={{ color:c }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── ZONE ANALYSIS TAB ──────────────────────────────────────────────── */}
      {tab === 'zones' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 14 }}>
          {zoneRisks.map(z => {
            const isExpanded = expandZone === z.zone
            return (
              <div key={z.zone} className="card" style={{ borderColor: z.riskColor + '30' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom: 12, cursor:'pointer' }}
                  onClick={()=>setExpandZone(isExpanded ? null : z.zone)}>
                  <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                    <ScoreGauge score={z.computedScore} color={z.riskColor} size={68} />
                    <div>
                      <div style={{ fontWeight:800, fontSize:16, color:'var(--t1)' }}>{z.zone}</div>
                      <span className={`badge bd-${z.riskLabel==='HIGH'?'danger':z.riskLabel==='MEDIUM'?'warning':'success'}`}>
                        {z.riskLabel} RISK
                      </span>
                      <div style={{ fontSize:11.5, color:'var(--t2)', marginTop:4 }}>Main hazard: <strong style={{color:z.riskColor}}>{z.mainHazard}</strong></div>
                    </div>
                  </div>
                  <i className={`fa-solid fa-chevron-${isExpanded?'up':'down'}`} style={{ color:'var(--t3)', fontSize:11, marginTop:4 }}></i>
                </div>

                {/* Quick stats */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
                  {[
                    [z.totalResidents,   'Residents',   'var(--blue)'],
                    [z.vulnerableCount,  'Vulnerable',  'var(--purple)'],
                    [z.unaccountedCount, 'Unaccounted', 'var(--red)'],
                    [z.evacuatedCount,   'Evacuated',   'var(--green)'],
                    [z.activeIncidents,  'Active Inc.', 'var(--red)'],
                    [z.totalIncidents,   'Total Inc.',  'var(--orange)'],
                  ].map(([v,l,c])=>(
                    <div key={l} style={{ background:'var(--bg-el)', borderRadius:8, padding:'7px 9px', textAlign:'center' }}>
                      <div style={{ fontWeight:800, fontSize:16, color:c }}>{v}</div>
                      <div style={{ fontSize:10, color:'var(--t3)', marginTop:1 }}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Hazard bars */}
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    ['Flood',     z.flood,     {High:'var(--red)',Medium:'var(--orange)',Low:'var(--green)'}[z.flood]||'var(--t3)'],
                    ['Landslide', z.landslide, {High:'var(--red)',Medium:'var(--orange)',Low:'var(--green)'}[z.landslide]||'var(--t3)'],
                    ['Storm',     z.storm,     {High:'var(--red)',Medium:'var(--orange)',Low:'var(--green)'}[z.storm]||'var(--t3)'],
                  ].map(([haz,lvl,c])=>(
                    <div key={haz} style={{ flex:1, textAlign:'center' }}>
                      <div style={{ fontSize:10, color:'var(--t3)', marginBottom:3 }}>{haz}</div>
                      <div style={{ fontSize:11.5, fontWeight:700, color:c }}>{lvl}</div>
                    </div>
                  ))}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
                    <div style={{ fontSize:12.5, color:'var(--t2)', lineHeight:1.7, marginBottom:10 }}>{z.description}</div>
                    <div style={{ background:'rgba(232,72,85,.05)', border:'1px solid rgba(232,72,85,.15)', borderRadius:9, padding:'10px 13px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--orange)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:5 }}>
                        <i className="fa-solid fa-lightbulb"></i> BDRRMC Recommendation
                      </div>
                      <div style={{ fontSize:12, color:'var(--t1)', lineHeight:1.65 }}>
                        {z.zone === 'Zone 1' && 'Maintain evacuation drills. Check drainage monthly. Conduct fire safety seminars.'}
                        {z.zone === 'Zone 2' && 'Pre-position emergency supplies. Monitor creek levels daily during rainy season.'}
                        {z.zone === 'Zone 3' && 'Mandatory pre-emptive evacuation planning. Deploy flood sensors near Cagayan River. Priority response zone.'}
                        {z.zone === 'Zone 4' && 'Conduct community awareness programs. Maintain first-aid inventory. Consider as primary evacuation hub.'}
                        {z.zone === 'Zone 5' && 'HIGH PRIORITY. Pre-evacuation recommended. Rescue teams on standby during heavy rain. No new construction on steep slopes.'}
                        {z.zone === 'Zone 6' && 'Monitor river and slope stability. Update resident contact lists. Install early warning sirens.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── RESIDENT RISK TABLE TAB ─────────────────────────────────────────── */}
      {tab === 'residents' && (
        <div>
          {/* Filters */}
          <div className="filter-row" style={{ marginBottom: 14 }}>
            <div className="search-wrap" style={{ flex: 1, maxWidth: 300 }}>
              <i className="fa-solid fa-magnifying-glass"></i>
              <input className="form-control search-inp" placeholder="Search by name..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="form-control" style={{ width: 140 }} value={filterZone} onChange={e=>setFilterZone(e.target.value)}>
              <option value="All">All Zones</option>
              {ZONES.map(z=><option key={z} value={z}>{z}</option>)}
            </select>
            <select className="form-control" style={{ width: 140 }} value={filterLevel} onChange={e=>setFilterLevel(e.target.value)}>
              <option value="All">All Risk Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
            <span style={{ fontSize:12, color:'var(--t2)', flexShrink:0 }}>{shownResidents.length} results</span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Zone</th>
                    <th>Risk Score</th>
                    <th>Risk Level</th>
                    <th>Evac Status</th>
                    <th>Vulnerability</th>
                    <th>HH Members</th>
                  </tr>
                </thead>
                <tbody>
                  {shownResidents.slice(0,100).map((r,i)=>{
                    const pct = r.score
                    const barColor = r.riskColor
                    return (
                      <tr key={r.id}>
                        <td>
                          <span style={{ fontSize:12, fontWeight:700, color:'var(--t3)' }}>
                            #{residentRisks.indexOf(r)+1}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight:600, color:'var(--t1)' }}>{r.name}</span>
                          {(r.vulnerabilityTags||[]).length>0 && <span style={{ marginLeft:5, fontSize:10, color:'var(--purple)' }}>⚠</span>}
                        </td>
                        <td><span style={{ color:'var(--t2)', fontSize:12.5 }}>{r.zone}</span></td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <div style={{ width:70, height:6, background:'var(--bg-el)', borderRadius:3, overflow:'hidden' }}>
                              <div style={{ width:`${pct}%`, height:'100%', background:barColor, borderRadius:3 }} />
                            </div>
                            <span style={{ fontWeight:800, color:barColor, fontSize:13, fontFamily:'var(--disp)', minWidth:28 }}>{r.score}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge bd-${r.riskLabel==='HIGH'?'danger':r.riskLabel==='MEDIUM'?'warning':'success'}`}>
                            {r.riskLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`badge bd-${r.evacuationStatus==='Safe'?'success':r.evacuationStatus==='Evacuated'?'info':'danger'}`}>
                            {r.evacuationStatus}
                          </span>
                        </td>
                        <td>
                          <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                            {(r.vulnerabilityTags||[]).map(t=>(
                              <span key={t} className="badge bd-purple" style={{ fontSize:9 }}>{t}</span>
                            ))}
                            {!(r.vulnerabilityTags||[]).length && <span style={{ color:'var(--t3)', fontSize:11 }}>—</span>}
                          </div>
                        </td>
                        <td><span style={{ color:'var(--t2)', fontSize:12 }}>{r.householdMembers||1}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {shownResidents.length === 0 && (
              <div className="empty-state">
                <i className="fa-solid fa-users"></i>
                <p>No residents match this filter.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
