// ─── MapPage.jsx ──────────────────────────────────────────────────────────────
// GIS Hazard Map — Barangay Kauswagan, CDO
// Pins only appear when real data exists (residents / evac centers with lat/lng)

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import { ZONE_FLOOD_RISK, ZONE_SUBDIVISIONS } from '../data/constants'

// Centre of Barangay Kauswagan (the "KAUSWAGAN" label on OSM)
const MAP_CENTER = [8.4942, 124.6447]
const INC_COLOR  = { Flood:'#5bc0eb', Fire:'#e84855', Earthquake:'#9b72cf', Landslide:'#f4a35a', Storm:'#f7c541' }

function makePin(L, color, emoji, size = 28) {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid rgba(255,255,255,.85);box-shadow:0 3px 10px rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);font-size:${Math.round(size*.38)}px;line-height:1">${emoji}</span></div>`,
    iconSize: [size, size], iconAnchor: [size/2, size], popupAnchor: [0, -size-4],
  })
}

function makeLbl(L, text, cls) {
  return L.divIcon({ className: cls, html: text, iconSize: null, iconAnchor: null })
}

export default function MapPage() {
  const { evacCenters, incidents, residents } = useApp()
  const mapRef  = useRef(null)
  const mapInst = useRef(null)
  const dataLG  = useRef({})
  const labelLG = useRef(null)

  const [filter,     setFilter]     = useState('all')
  const [showRings,  setShowRings]  = useState(true)

  const rebuildData = () => {
    if (!mapInst.current || !window.L) return
    const L   = window.L
    const map = mapInst.current

    Object.values(dataLG.current).forEach(lg => lg && map.removeLayer(lg))
    dataLG.current = {}

    const showEvac = filter === 'all' || filter === 'evacuation'
    const showInc  = filter === 'all' || filter === 'incidents'
    const showRes  = filter === 'all' || filter === 'residents'

    // ── Evacuation centers — only if they have GPS coords ───────────────────
    if (showEvac) {
      const lg = L.layerGroup().addTo(map)
      evacCenters.forEach(c => {
        if (!c.lat || !c.lng) return
        const color = c.status === 'Open' ? '#00d68f' : c.status === 'Full' ? '#f4a35a' : '#e84855'
        L.marker([c.lat, c.lng], { icon: makePin(L, color, '🏠', 32) })
          .addTo(lg)
          .bindPopup(
            `<b>${c.name}</b><br>` +
            `<span style="color:#5bc0eb">${c.zone}</span> · <b style="color:${color}">${c.status}</b><br>` +
            `👥 ${c.occupancy}/${c.capacity} occupants<br>` +
            `${(c.facilitiesAvailable || []).join(', ') || '—'}`
          )
      })
      dataLG.current.evacuation = lg
    }

    // ── Incidents — only if they have GPS coords ─────────────────────────────
    if (showInc) {
      const lg = L.layerGroup().addTo(map)
      incidents.forEach(inc => {
        if (!inc.lat || !inc.lng) return
        const color = INC_COLOR[inc.type] || '#5bc0eb'
        L.marker([inc.lat, inc.lng], { icon: makePin(L, color, '⚠', 26) })
          .addTo(lg)
          .bindPopup(
            `<b>${inc.type} Incident</b><br>` +
            `${inc.zone} — ${inc.location || '—'}<br>` +
            `Severity: <b>${inc.severity}</b> · Status: <b>${inc.status}</b><br>` +
            `Reporter: ${inc.reporter || '—'}`
          )
      })
      dataLG.current.incidents = lg
    }

    // ── Residents — only those with actual GPS coords ────────────────────────
    if (showRes) {
      const lg = L.layerGroup().addTo(map)
      const pinned = residents.filter(r => r.lat && r.lng)
      pinned.slice(0, 500).forEach(r => {
        const color = {
          Safe:         '#00d68f',
          Evacuated:    '#5bc0eb',
          Unaccounted:  '#e84855',
        }[r.evacuationStatus] || '#5bc0eb'

        L.marker([r.lat, r.lng], { icon: makePin(L, color, '👤', 22) })
          .addTo(lg)
          .bindPopup(
            `<b>${r.name}</b><br>` +
            `${r.zone} — ${r.address || '—'}<br>` +
            `Status: <b>${r.evacuationStatus}</b> · ${r.householdMembers || 1} member(s)` +
            ((r.vulnerabilityTags || []).length ? `<br>⚠ ${r.vulnerabilityTags.join(', ')}` : '')
          )
      })
      dataLG.current.residents = lg
    }
  }

  const rebuildLabels = () => {
    if (!mapInst.current || !window.L) return
    const L   = window.L
    const map = mapInst.current

    if (labelLG.current) map.removeLayer(labelLG.current)
    const lg = L.layerGroup().addTo(map)

    if (showRings) {
      Object.entries(ZONE_FLOOD_RISK).forEach(([zoneName, risk]) => {
        const subs = ZONE_SUBDIVISIONS[zoneName]
        if (!subs || !subs[0]) return
        const color = { high:'#e84855', medium:'#f4a35a', low:'#00d68f' }[risk] || '#5bc0eb'
        L.circle([subs[0].lat, subs[0].lng], {
          radius: 90, color, fillColor: color,
          fillOpacity: .04, weight: 1.5, dashArray: '5 5',
        }).addTo(lg)
      })
    }

    labelLG.current = lg
  }

  // ── Init Leaflet ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapInst.current) return

    const init = () => {
      if (!window.L || !mapRef.current || mapInst.current) return
      const L   = window.L
      const map = L.map(mapRef.current, {
        center: MAP_CENTER, zoom: 16, minZoom: 13, maxZoom: 19,
      })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map)

      // Barangay Hall marker
      L.marker(MAP_CENTER, {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:linear-gradient(135deg,#9b72cf,#7050a8);color:#fff;border-radius:8px;padding:4px 11px;font-size:10px;font-weight:800;border:1.5px solid rgba(255,255,255,.7);box-shadow:0 3px 10px rgba(0,0,0,.5);white-space:nowrap">🏛 BRGY HALL</div>`,
          iconAnchor: [46, 14],
        }),
      }).addTo(map).bindPopup('<b>Barangay Kauswagan Hall</b><br>BDRRMC Command Center')

      mapInst.current = map
      rebuildData()
      rebuildLabels()
    }

    if (window.L) { init() }
    else {
      const t = setInterval(() => { if (window.L) { clearInterval(t); init() } }, 200)
      return () => clearInterval(t)
    }
    return () => {
      if (mapInst.current) { mapInst.current.remove(); mapInst.current = null }
    }
  }, []) // eslint-disable-line

  useEffect(() => { rebuildData() }, [evacCenters, incidents, residents, filter]) // eslint-disable-line
  useEffect(() => { rebuildLabels() }, [showRings]) // eslint-disable-line

  const activeInc   = incidents.filter(i => ['Active','Pending'].includes(i.status)).length
  const openCenters = evacCenters.filter(c => c.status === 'Open').length
  const evacuated   = residents.filter(r => r.evacuationStatus === 'Evacuated').length

  const LAYER_BTNS = [
    { key:'all',        label:'All',       icon:'fa-layer-group' },
    { key:'evacuation', label:'Evac',      icon:'fa-house-flag' },
    { key:'incidents',  label:'Incidents', icon:'fa-circle-radiation' },
    { key:'residents',  label:'Residents', icon:'fa-users' },
  ]

  return (
    <div className="map-page">
      <div className="page-hdr">
        <div>
          <div className="page-title">GIS Hazard Map</div>
          <div className="page-sub">Live situational awareness — Barangay Kauswagan, CDO · Click any pin for details</div>
        </div>
        <div className="map-hdr-stats">
          <div className="map-hdr-stat"><span className="map-stat-val map-stat-red">{activeInc}</span><span className="map-stat-lbl">Active Incidents</span></div>
          <div className="map-hdr-stat"><span className="map-stat-val map-stat-green">{openCenters}</span><span className="map-stat-lbl">Open Centers</span></div>
          <div className="map-hdr-stat"><span className="map-stat-val map-stat-blue">{evacuated}</span><span className="map-stat-lbl">Evacuated</span></div>
          <div className="map-hdr-stat"><span className="map-stat-val map-stat-blue">{residents.length}</span><span className="map-stat-lbl">Residents</span></div>
        </div>
      </div>

      <div className="map-fullwrap">
        <div className="map-ctrl-panel">
          <div className="map-ctrl-row">
            {LAYER_BTNS.map(b => (
              <button key={b.key} type="button"
                className={'map-ctrl-btn' + (filter === b.key ? ' active' : '')}
                onClick={() => setFilter(b.key)}>
                <i className={'fa-solid ' + b.icon}></i> {b.label}
              </button>
            ))}
          </div>
          <div className="map-ctrl-row map-ctrl-checks">
            <label className="map-check-lbl">
              <input type="checkbox" checked={showRings} onChange={e => setShowRings(e.target.checked)} />
              Risk Rings
            </label>
          </div>
        </div>

        <div id="leaflet-map" ref={mapRef} className="map-canvas"></div>
      </div>
    </div>
  )
}
