import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useWeatherData } from '../context/WeatherContext'
import { useRiskEngine } from '../hooks/useRiskEngine'
import { ZONES } from '../data/constants'

function ScoreGauge({ score, color, size = 90 }) {
  const radius     = (size / 2) - 8
  const circ       = 2 * Math.PI * radius
  const dashOffset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--bg-el)" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={dashOffset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset .5s ease' }} />
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fill: color, fontSize: size > 80 ? 16 : 13, fontWeight: 800,
          transform: 'rotate(90deg)', transformOrigin: 'center' }}>
        {score}
      </text>
    </svg>
  )
}

export default function RiskIntelligencePage() {
  const { incidents, residents, evacCenters } = useApp()
  const weather = useWeatherData()
  const { residentRisks, zoneRisks, highCount, mediumCount, lowCount, overallScore, isRainySeason } =
    useRiskEngine(residents, incidents, weather)

  const [tab,         setTab]         = useState('overview')
  const [filterZone,  setFilterZone]  = useState('All')
  const [filterLevel, setFilterLevel] = useState('All')
  const [search,      setSearch]      = useState('')
  const [showScoring, setShowScoring] = useState(false)

  const shownResidents = residentRisks.filter(r => {
    const mz = filterZone  === 'All' || r.zone      === filterZone
    const ml = filterLevel === 'All' || r.riskLabel === filterLevel
    const mq = (r.name||'').toLowerCase().includes(search.toLowerCase())
    return mz && ml && mq
  })

  const overallColor = overallScore >= 70 ? 'var(--red)' : overallScore >= 40 ? 'var(--orange)' : 'var(--green)'
  const overallLabel = overallScore >= 70 ? 'HIGH' : overallScore >= 40 ? 'MEDIUM' : 'LOW'

  const weatherColor = weather.riskLevel === 'High' ? 'var(--red)'
    : weather.riskLevel === 'Medium' ? 'var(--orange)' : 'var(--green)'

  return (
    <div>
      {/* Page header */}
      <div className="page-hdr">
        <div>
          <div className="page-title">Risk Intelligence</div>
          <div className="page-sub">
            AI-powered multi-factor risk scoring · Weighted model similar to logistic regression
            {isRainySeason && (
              <span className="badge bd-warning" style={{ marginLeft: 10, fontSize: 10 }}>
                Rainy Season Active (+8 pts)
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px',
            background: 'var(--bg-inp)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <i className={'fa-solid ' + (weather.icon || 'fa-cloud')} style={{ color: 'var(--blue)' }}></i>
            <span style={{ fontSize: 12, color: 'var(--t2)' }}>Weather:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: weatherColor }}>{weather.riskLevel}</span>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>{weather.temperature}°C · {weather.windSpeed} km/h</span>
          </div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => setShowScoring(true)}>
            <i className="fa-solid fa-info-circle"></i> Scoring Rules
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        {/* Overall gauge — color changes live */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8, padding: 16, border: '2px solid ' + overallColor + '40' }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--t3)',
            textTransform: 'uppercase', letterSpacing: '.5px' }}>Overall Risk</div>
          <ScoreGauge score={overallScore} color={overallColor} size={100} />
          <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 14px', borderRadius: 20,
            background: overallColor + '22', color: overallColor,
            border: '1px solid ' + overallColor + '44',
            letterSpacing: '.5px', textTransform: 'uppercase' }}>
            {overallLabel}
          </span>
        </div>

        {/* KPI cards */}
        {[
          [highCount,   'High Risk',    'Residents scoring 70+',    'var(--red)',    'fa-triangle-exclamation', 'HIGH'],
          [mediumCount, 'Medium Risk',  'Residents scoring 40-69',  'var(--orange)', 'fa-circle-exclamation',   'MEDIUM'],
          [lowCount,    'Low Risk',     'Residents scoring 0-39',   'var(--green)',  'fa-circle-check',         'LOW'],
          [residents.filter(r => r.evacuationStatus === 'Unaccounted').length,
           'Unaccounted', 'Evacuation status unknown', 'var(--yellow)', 'fa-person-circle-question', null],
        ].map(([v, l, sub, c, ico, level]) => (
          <div key={l} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14,
            border: '1px solid ' + c + '33', cursor: level ? 'pointer' : 'default' }}
            onClick={() => { if (level) { setTab('residents'); setFilterLevel(level) } }}>
            <div style={{ width: 46, height: 46, borderRadius: 11, background: c + '1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={'fa-solid ' + ico} style={{ color: c, fontSize: 20 }}></i>
            </div>
            <div>
              <div style={{ fontSize: 32, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginTop: 3 }}>{l}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 7, marginBottom: 18 }}>
        {[
          ['overview',  'fa-chart-pie', 'Overview'],
          ['zones',     'fa-map-pin',   'Zone Analysis'],
          ['residents', 'fa-users',     'Resident Scores'],
        ].map(([k, ico, lbl]) => (
          <button key={k} type="button"
            className={'btn btn-sm ' + (tab === k ? 'btn-primary' : 'btn-secondary')}
            onClick={() => setTab(k)}>
            <i className={'fa-solid ' + ico}></i> {lbl}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="card">
            <div className="sec-title"><i className="fa-solid fa-chart-bar"></i> Risk Distribution</div>
            {[
              ['HIGH',   highCount,   'var(--red)'],
              ['MEDIUM', mediumCount, 'var(--orange)'],
              ['LOW',    lowCount,    'var(--green)'],
            ].map(([lbl, count, color]) => {
              const total = residentRisks.length
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={lbl} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span className={'badge bd-' + (lbl === 'HIGH' ? 'danger' : lbl === 'MEDIUM' ? 'warning' : 'success')}>
                      {lbl}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>
                      {count} residents ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 11, background: 'var(--bg-el)', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: color,
                      borderRadius: 6, transition: 'width .5s ease' }} />
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4 }}>
              Total residents scored: <strong style={{ color: 'var(--t1)' }}>{residentRisks.length}</strong>
            </div>
          </div>

          <div className="card">
            <div className="sec-title"><i className="fa-solid fa-cloud-bolt"></i> Live Scoring Modifiers</div>
            {[
              ['Weather Risk',      weather.riskLevel || '—', weatherColor],
              ['Temperature',       (weather.temperature || '—') + 'C',   'var(--blue)'],
              ['Wind Speed',        (weather.windSpeed  || '—') + ' km/h','var(--blue)'],
              ['Humidity',          (weather.humidity   || '—') + '%',    'var(--blue)'],
              ['Rainy Season',      isRainySeason ? 'Yes (+8 pts)' : 'No', isRainySeason ? 'var(--orange)' : 'var(--green)'],
              ['Active Incidents',  incidents.filter(i => ['Active','Pending'].includes(i.status)).length + ' active', 'var(--red)'],
              ['Open Evac Centers', evacCenters.filter(c => c.status === 'Open').length + ' / ' + evacCenters.length, 'var(--green)'],
            ].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between',
                padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--t2)' }}>{l}</span>
                <strong style={{ color: c }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZONE ANALYSIS TAB — TABLE */}
      {tab === 'zones' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Zone Risk Analysis</div>
            <div style={{ fontSize: 12, color: 'var(--t2)', marginTop: 2 }}>
              Sorted highest to lowest score · Updates live as data changes
            </div>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Zone</th>
                  <th>Score</th>
                  <th>Risk Level</th>
                  <th>Main Hazard</th>
                  <th>Residents</th>
                  <th>Vulnerable</th>
                  <th>Unaccounted</th>
                  <th>Evacuated</th>
                  <th>Active Inc.</th>
                  <th>Flood</th>
                  <th>Landslide</th>
                  <th>Storm</th>
                </tr>
              </thead>
              <tbody>
                {zoneRisks.map(z => {
                  const hc = l => l === 'High' ? 'var(--red)' : l === 'Medium' ? 'var(--orange)' : 'var(--green)'
                  return (
                    <tr key={z.zone}>
                      <td style={{ fontWeight: 700, fontSize: 13 }}>{z.zone}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 50, height: 6, background: 'var(--bg-el)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: z.computedScore + '%', height: '100%', background: z.riskColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 800, color: z.riskColor, fontSize: 14 }}>{z.computedScore}</span>
                        </div>
                      </td>
                      <td>
                        <span className={'badge bd-' + (z.riskLabel === 'HIGH' ? 'danger' : z.riskLabel === 'MEDIUM' ? 'warning' : 'success')}
                          style={{ minWidth: 64, textAlign: 'center' }}>
                          {z.riskLabel}
                        </span>
                      </td>
                      <td style={{ color: 'var(--t2)', fontSize: 12.5 }}>{z.mainHazard}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>{z.totalResidents}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--purple)' }}>{z.vulnerableCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--red)' }}>{z.unaccountedCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--green)' }}>{z.evacuatedCount}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: z.activeIncidents > 0 ? 'var(--red)' : 'var(--t3)' }}>
                        {z.activeIncidents}
                      </td>
                      <td><span style={{ fontSize: 12, fontWeight: 700, color: hc(z.flood) }}>{z.flood}</span></td>
                      <td><span style={{ fontSize: 12, fontWeight: 700, color: hc(z.landslide) }}>{z.landslide}</span></td>
                      <td><span style={{ fontSize: 12, fontWeight: 700, color: hc(z.storm) }}>{z.storm}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Recommendations */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--t3)',
              textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>
              BDRRMC Recommendations
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 10 }}>
              {zoneRisks.map(z => (
                <div key={z.zone} style={{ background: 'var(--bg-el)', borderRadius: 9,
                  padding: '11px 14px', borderLeft: '3px solid ' + z.riskColor }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: z.riskColor }}>{z.zone}</span>
                    <span className={'badge bd-' + (z.riskLabel === 'HIGH' ? 'danger' : z.riskLabel === 'MEDIUM' ? 'warning' : 'success')}
                      style={{ fontSize: 9 }}>{z.riskLabel}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
                    {z.zone === 'Zone 1' && 'Maintain evacuation drills. Check drainage monthly. Conduct fire safety seminars.'}
                    {z.zone === 'Zone 2' && 'Pre-position emergency supplies. Monitor creek levels daily during rainy season.'}
                    {z.zone === 'Zone 3' && 'Mandatory pre-emptive evacuation planning. Deploy flood sensors near Cagayan River. Priority response zone.'}
                    {z.zone === 'Zone 4' && 'Conduct community awareness. Maintain first-aid inventory. Consider as primary evacuation hub.'}
                    {z.zone === 'Zone 5' && 'HIGH PRIORITY. Pre-evacuation recommended. Rescue teams on standby. No new construction on steep slopes.'}
                    {z.zone === 'Zone 6' && 'Monitor river and slope stability. Update resident contact lists. Install early warning sirens.'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RESIDENT SCORES TAB */}
      {tab === 'residents' && (
        <div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
              <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: 13, pointerEvents: 'none' }}></i>
              <input className="form-ctrl" style={{ paddingLeft: 36 }}
                placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ position: 'relative' }}>
              <select className="form-ctrl" style={{ minWidth: 140, paddingRight: 32 }}
                value={filterZone} onChange={e => setFilterZone(e.target.value)}>
                <option value="All">All Zones</option>
                {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
              <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', right: 11, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: 11, pointerEvents: 'none' }}></i>
            </div>
            <div style={{ position: 'relative' }}>
              <select className="form-ctrl" style={{ minWidth: 170, paddingRight: 32 }}
                value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                <option value="All">All Risk Levels</option>
                <option value="HIGH">High Risk ({highCount})</option>
                <option value="MEDIUM">Medium Risk ({mediumCount})</option>
                <option value="LOW">Low Risk ({lowCount})</option>
              </select>
              <i className="fa-solid fa-chevron-down" style={{ position: 'absolute', right: 11, top: '50%',
                transform: 'translateY(-50%)', color: 'var(--t3)', fontSize: 11, pointerEvents: 'none' }}></i>
            </div>
            <span style={{ fontSize: 12, color: 'var(--t3)', flexShrink: 0 }}>
              {shownResidents.length} of {residentRisks.length} residents
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Name</th>
                    <th>Zone</th>
                    <th>Score</th>
                    <th>Risk Level</th>
                    <th>Evac Status</th>
                    <th>Vulnerability</th>
                    <th>HH</th>
                  </tr>
                </thead>
                <tbody>
                  {shownResidents.slice(0, 100).map(r => (
                    <tr key={r.id}>
                      <td style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)' }}>
                        #{residentRisks.indexOf(r) + 1}
                      </td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{r.name}</span>
                        {(r.vulnerabilityTags || []).length > 0 &&
                          <span style={{ marginLeft: 5, fontSize: 10, color: 'var(--purple)' }}>!</span>}
                      </td>
                      <td style={{ color: 'var(--t2)', fontSize: 12.5 }}>{r.zone}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 60, height: 6, background: 'var(--bg-el)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: r.score + '%', height: '100%', background: r.riskColor, borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 800, color: r.riskColor, fontSize: 13, minWidth: 24 }}>{r.score}</span>
                        </div>
                      </td>
                      <td>
                        <span className={'badge bd-' + (r.riskLabel === 'HIGH' ? 'danger' : r.riskLabel === 'MEDIUM' ? 'warning' : 'success')}>
                          {r.riskLabel}
                        </span>
                      </td>
                      <td>
                        <span className={'badge bd-' + (r.evacuationStatus === 'Safe' ? 'success' : r.evacuationStatus === 'Evacuated' ? 'info' : 'danger')}>
                          {r.evacuationStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                          {(r.vulnerabilityTags || []).map(t =>
                            <span key={t} className="badge bd-purple" style={{ fontSize: 9 }}>{t}</span>
                          )}
                          {!(r.vulnerabilityTags || []).length &&
                            <span style={{ color: 'var(--t3)', fontSize: 11 }}>-</span>}
                        </div>
                      </td>
                      <td style={{ color: 'var(--t2)', fontSize: 12 }}>{r.householdMembers || 1}</td>
                    </tr>
                  ))}
                  {shownResidents.length === 0 && (
                    <tr><td colSpan={8}>
                      <div className="empty" style={{ padding: 28 }}>
                        <i className="fa-solid fa-users"></i>
                        <p>No residents match this filter.</p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Scoring Rules Modal */}
      {showScoring && (
        <div className="modal-overlay" onClick={() => setShowScoring(false)}>
          <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span style={{ fontWeight: 700 }}>
                <i className="fa-solid fa-info-circle" style={{ color: 'var(--blue)', marginRight: 8 }}></i>
                How Scores Are Calculated
              </span>
              <button className="modal-close" onClick={() => setShowScoring(false)} type="button">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ padding: '4px 22px 18px' }}>
              <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 16, lineHeight: 1.6 }}>
                Each resident receives a risk score from 0 to 100 based on these weighted factors.
                Scores recalculate automatically whenever data changes.
              </p>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 170 }}>Factor</th>
                      <th>How It Affects the Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Zone Base Score',    'Each zone has a baseline — Zone 5=82, Zone 3=78, Zone 6=48, Zone 2=42, Zone 1=25, Zone 4=18'],
                      ['Vulnerability Tags', 'Bedridden +12, PWD +10, Senior Citizen +8, Pregnant +8, Infant +7 (capped at +40 total)'],
                      ['Evacuation Status',  'Unaccounted adds +18 pts · Evacuated subtracts -15 pts'],
                      ['Household Size',     'Each extra household member adds 1.8 pts, capped at +12'],
                      ['Active Incidents',   'Each active incident in the zone adds +6 pts, capped at +20'],
                      ['Weather',            'High weather risk +15 pts · Medium weather risk +7 pts'],
                      ['Rainy Season',       'Months June-November automatically add +8 pts to all scores'],
                    ].map(([factor, desc]) => (
                      <tr key={factor}>
                        <td style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 13 }}>{factor}</td>
                        <td style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6 }}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 14, padding: '10px 14px',
                background: 'rgba(91,192,235,.08)', border: '1px solid rgba(91,192,235,.2)', borderRadius: 9 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', marginBottom: 5 }}>
                  Score Interpretation
                </div>
                <div style={{ display: 'flex', gap: 18, fontSize: 13 }}>
                  <span><strong style={{ color: 'var(--red)' }}>70-100</strong> = HIGH RISK</span>
                  <span><strong style={{ color: 'var(--orange)' }}>40-69</strong> = MEDIUM RISK</span>
                  <span><strong style={{ color: 'var(--green)' }}>0-39</strong> = LOW RISK</span>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-primary" onClick={() => setShowScoring(false)} type="button">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
