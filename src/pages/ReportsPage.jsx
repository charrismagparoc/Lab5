import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { ZONE_RISK_DATA, ZONE_RECOMMENDATIONS } from '../data/constants'

const TYPE_COLORS = { Flood:'#5bc0eb', Fire:'#e84855', Earthquake:'#9b72cf', Landslide:'#f4a35a', Storm:'#f7c541' }
const TYPES = ['Flood','Fire','Earthquake','Landslide','Storm']

function generateHTML(incidents, alerts, evacCenters, residents, resources) {
  const now = new Date().toLocaleString('en-PH',{dateStyle:'long',timeStyle:'short'})
  const totalCap = evacCenters.reduce((a,c) => a+(c.capacity||0), 0)
  const totalOcc = evacCenters.reduce((a,c) => a+(c.occupancy||0), 0)
  const byType = TYPES.map(t => ({ type:t, count:incidents.filter(i=>i.type===t).length }))

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>IDRMS Situation Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;font-size:12px;color:#1a2236;background:#fff}
.hdr{background:linear-gradient(135deg,#0c1120,#192540);color:#fff;padding:24px 32px;display:flex;align-items:center;gap:16px}
.hdr-logo{width:50px;height:50px;background:linear-gradient(135deg,#e84855,#b5303a);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0}
.hdr h1{font-size:19px;font-weight:800}
.hdr p{font-size:11px;color:rgba(255,255,255,.6);margin-top:3px}
.hdr-r{margin-left:auto;text-align:right;font-size:11px;color:rgba(255,255,255,.6)}
.hdr-r strong{display:block;font-size:12px;color:#fff}
.sec{padding:18px 32px;border-bottom:1px solid #e8ecf1}
.sec:last-child{border-bottom:none}
.sec-ttl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#5a6472;margin-bottom:10px}
.stats{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}
.sbox{background:#f5f7fa;border-radius:7px;padding:11px;text-align:center;border:1px solid #e8ecf1}
.sval{font-size:22px;font-weight:800}
.slbl{font-size:9px;font-weight:600;color:#88929c;text-transform:uppercase;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:11px}
th{background:#f5f7fa;padding:7px 10px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#88929c;border-bottom:2px solid #e8ecf1}
td{padding:7px 10px;border-bottom:1px solid #f0f2f5;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:nth-child(even) td{background:#fafbfc}
.bd-d{background:#fde8ea;color:#e63946;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700}
.bd-w{background:#fef3e2;color:#f4a261;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700}
.bd-s{background:#e6f9f4;color:#04a87a;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700}
.bd-i{background:#e6f7fc;color:#2ba8d0;padding:2px 7px;border-radius:4px;font-size:9px;font-weight:700}
.ftr{background:#f5f7fa;padding:12px 32px;text-align:center;font-size:10px;color:#88929c}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="hdr">
  <div class="hdr-logo">🛡️</div>
  <div class="hdr"><div style="display:flex;flex-direction:column">
    <h1>IDRMS Situation Report</h1>
    <p>Barangay Kauswagan BDRRMC · Cagayan de Oro City</p>
  </div></div>
  <div class="hdr-r"><strong>Generated: ${now}</strong>CONFIDENTIAL — Official Use Only</div>
</div>
<div class="sec">
  <div class="sec-ttl">Executive Summary</div>
  <div class="stats">
    <div class="sbox"><div class="sval" style="color:#f4a35a">${incidents.length}</div><div class="slbl">Total Incidents</div></div>
    <div class="sbox"><div class="sval" style="color:#e84855">${incidents.filter(i=>i.status==='Active').length}</div><div class="slbl">Active</div></div>
    <div class="sbox"><div class="sval" style="color:#00d68f">${incidents.filter(i=>i.status==='Resolved').length}</div><div class="slbl">Resolved</div></div>
    <div class="sbox"><div class="sval" style="color:#5bc0eb">${residents.length}</div><div class="slbl">Residents</div></div>
    <div class="sbox"><div class="sval" style="color:#f4a35a">${totalOcc}/${totalCap}</div><div class="slbl">Evac Occupancy</div></div>
    <div class="sbox"><div class="sval" style="color:#9b72cf">${alerts.length}</div><div class="slbl">Alerts Sent</div></div>
  </div>
</div>
<div class="sec">
  <div class="sec-ttl">Zone Risk Assessment</div>
  <table><thead><tr><th>Zone</th><th>Risk Level</th><th>Main Hazard</th><th>Incidents</th><th>Recommendations</th></tr></thead>
  <tbody>${ZONE_RISK_DATA.map(z=>`<tr>
    <td><strong>${z.zone}</strong></td>
    <td><span class="${z.riskLevel==='High'?'bd-d':z.riskLevel==='Medium'?'bd-w':'bd-s'}">${z.riskLevel}</span></td>
    <td>${z.mainHazard}</td>
    <td style="text-align:center">${incidents.filter(i=>i.zone===z.zone).length}</td>
    <td style="font-size:10px">${ZONE_RECOMMENDATIONS[z.zone]||'—'}</td>
  </tr>`).join('')}</tbody></table>
</div>
<div class="sec">
  <div class="sec-ttl">Incident Records (${incidents.slice(0,30).length} of ${incidents.length})</div>
  <table><thead><tr><th>Type</th><th>Zone</th><th>Location</th><th>Severity</th><th>Status</th><th>Reporter</th><th>Date</th></tr></thead>
  <tbody>${incidents.slice(0,30).map(i=>`<tr>
    <td>${i.type}</td><td>${i.zone}</td><td>${i.location||'—'}</td>
    <td><span class="${i.severity==='High'?'bd-d':i.severity==='Medium'?'bd-w':'bd-i'}">${i.severity}</span></td>
    <td>${i.status}</td><td>${i.reporter||'—'}</td>
    <td>${i.dateReported?new Date(i.dateReported).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—'}</td>
  </tr>`).join('')}</tbody></table>
</div>
<div class="sec">
  <div class="sec-ttl">Evacuation Centers</div>
  <table><thead><tr><th>Name</th><th>Zone</th><th>Status</th><th>Occupancy</th><th>Capacity</th><th>Facilities</th></tr></thead>
  <tbody>${evacCenters.map(c=>`<tr>
    <td>${c.name}</td><td>${c.zone}</td>
    <td><span class="${c.status==='Open'?'bd-s':c.status==='Full'?'bd-w':'bd-d'}">${c.status}</span></td>
    <td style="text-align:center">${c.occupancy}</td>
    <td style="text-align:center">${c.capacity}</td>
    <td style="font-size:10px">${(c.facilitiesAvailable||[]).join(', ')||'—'}</td>
  </tr>`).join('')}</tbody></table>
</div>
<div class="ftr">IDRMS v2.0 · BDRRMC Barangay Kauswagan · Cagayan de Oro City · Confidential</div>
</body></html>`
}

export default function ReportsPage() {
  const { incidents, alerts, evacCenters, residents, resources } = useApp()
  const [generating, setGenerating] = useState(false)

  const handlePrint = () => {
    const html = generateHTML(incidents, alerts, evacCenters, residents, resources)
    const w = window.open('', '_blank')
    if (!w) { alert('Please allow popups for this site.'); return }
    w.document.write(html)
    w.document.close()
    w.onload = () => { w.print() }
  }

  const handleDownload = () => {
    setGenerating(true)
    setTimeout(() => {
      const html = generateHTML(incidents, alerts, evacCenters, residents, resources)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `IDRMS_Report_${new Date().toISOString().slice(0,10)}.html`
      a.click()
      URL.revokeObjectURL(url)
      setGenerating(false)
    }, 600)
  }

  const byType = TYPES.map(t => ({ type:t, count:incidents.filter(i=>i.type===t).length }))
  const maxType = Math.max(...byType.map(x=>x.count), 1)
  const totalCap = evacCenters.reduce((a,c)=>a+(c.capacity||0),0)
  const totalOcc = evacCenters.reduce((a,c)=>a+(c.occupancy||0),0)

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Reports & Analytics</div>
          <div className="page-sub">Generate situation reports and view statistics</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-secondary" onClick={handlePrint} type="button">
            <i className="fa-solid fa-print"></i> Print Report
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={generating} type="button">
            {generating ? <><i className="fa-solid fa-spinner fa-spin"></i> Generating...</> : <><i className="fa-solid fa-download"></i> Download HTML</>}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {[
          ['Total Incidents', incidents.length,                                             'var(--orange)','fa-triangle-exclamation'],
          ['Active',          incidents.filter(i=>i.status==='Active').length,              'var(--red)',   'fa-circle-radiation'],
          ['Resolved',        incidents.filter(i=>i.status==='Resolved').length,            'var(--green)', 'fa-circle-check'],
          ['Total Residents', residents.length,                                             'var(--blue)',  'fa-users'],
          ['Evac Occupancy',  `${totalOcc}/${totalCap}`,                                   'var(--yellow)','fa-house-flag'],
          ['Alerts Sent',     alerts.length,                                               'var(--purple)','fa-bell'],
        ].map(([l,v,c,icon]) => (
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <i className={'fa-solid ' + icon} style={{ color:c, fontSize:20, marginBottom:6, display:'block' }}></i>
            <div style={{ fontSize:22, fontWeight:800, color:c, fontFamily:'var(--disp)' }}>{v}</div>
            <div style={{ fontSize:11, color:'var(--t2)', marginTop:3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
        {/* Incidents by type */}
        <div className="card">
          <div className="sec-title"><i className="fa-solid fa-chart-bar"></i> Incidents by Type</div>
          {byType.map(({ type, count }) => (
            <div key={type} style={{ display:'flex', alignItems:'center', gap:9, marginBottom:9 }}>
              <span style={{ fontSize:11.5, color:'var(--t2)', width:80, flexShrink:0 }}>{type}</span>
              <div style={{ flex:1, height:10, background:'var(--bg-el)', borderRadius:5, overflow:'hidden' }}>
                <div style={{ height:'100%', width:(count/maxType*100)+'%', background:TYPE_COLORS[type], borderRadius:5, transition:'width .4s' }}></div>
              </div>
              <span style={{ fontSize:12, fontWeight:700, width:20, textAlign:'right', flexShrink:0 }}>{count}</span>
            </div>
          ))}
        </div>

        {/* Zone risk */}
        <div className="card">
          <div className="sec-title"><i className="fa-solid fa-map-pin"></i> Zone Risk Summary</div>
          <table style={{ fontSize:12 }}>
            <thead><tr><th>Zone</th><th>Risk</th><th>Main Hazard</th><th>Incidents</th></tr></thead>
            <tbody>
              {ZONE_RISK_DATA.map(z => (
                <tr key={z.zone}>
                  <td style={{ fontWeight:600 }}>{z.zone}</td>
                  <td><span className={'badge ' + (z.riskLevel==='High'?'bd-danger':z.riskLevel==='Medium'?'bd-warning':'bd-success')}>{z.riskLevel}</span></td>
                  <td style={{ color:'var(--t2)' }}>{z.mainHazard}</td>
                  <td style={{ textAlign:'center', fontWeight:700 }}>{incidents.filter(i=>i.zone===z.zone).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Evac centers */}
      <div className="card">
        <div className="sec-title"><i className="fa-solid fa-house-flag"></i> Evacuation Center Status</div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Center Name</th><th>Zone</th><th>Status</th><th>Occupancy</th><th>Capacity</th><th>Util %</th></tr></thead>
            <tbody>
              {evacCenters.map(c => {
                const pct = c.capacity > 0 ? Math.round((c.occupancy/c.capacity)*100) : 0
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight:600 }}>{c.name}</td>
                    <td>{c.zone}</td>
                    <td><span className={'badge ' + (c.status==='Open'?'bd-success':c.status==='Full'?'bd-warning':'bd-neutral')}>{c.status}</span></td>
                    <td style={{ textAlign:'center' }}>{c.occupancy}</td>
                    <td style={{ textAlign:'center' }}>{c.capacity}</td>
                    <td style={{ textAlign:'center' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <div style={{ flex:1, height:5, background:'var(--bg-el)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:pct+'%', background:pct>80?'var(--red)':pct>50?'var(--orange)':'var(--green)' }}></div>
                        </div>
                        <span style={{ fontSize:11, flexShrink:0 }}>{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {evacCenters.length === 0 && <tr><td colSpan={6}><div className="empty" style={{ padding:20 }}><p>No evacuation centers.</p></div></td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
