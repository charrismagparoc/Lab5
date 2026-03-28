import { useState, useCallback, useEffect } from 'react'
import { ZONE_COORDS } from '../data/zones'

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 CONFIGURATION
// Change API_URL to your Django server address.
// If running Django locally: http://localhost:8000/api
// ─────────────────────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:8000/api'  // ← Web uses localhost (runs in same PC browser)

let _id = 1000
const nextId = () => String(++_id)
const now    = () => new Date().toISOString()

// ── Field normalizers (DB snake_case → JS camelCase) ─────────────────────────
const normInc  = r => ({
  ...r,
  dateReported: r.date_reported || r.dateReported || r.created_at,
  createdAt:    r.created_at    || r.createdAt,
})
const normEvac = r => ({
  ...r,
  facilitiesAvailable: r.facilities_available || r.facilitiesAvailable || [],
  contactPerson:       r.contact_person       || r.contactPerson       || '',
})
const normRes  = r => ({
  ...r,
  householdMembers:  r.household_members  || r.householdMembers  || 1,
  evacuationStatus:  r.evacuation_status  || r.evacuationStatus  || 'Safe',
  vulnerabilityTags: r.vulnerability_tags || r.vulnerabilityTags || [],
  addedBy:           r.added_by           || r.addedBy           || 'Web',
  addedAt:           r.added_at           || r.addedAt           || r.created_at,
  updatedAt:         r.updated_at         || r.updatedAt,
  createdAt:         r.created_at         || r.createdAt,
})
const normUser = r => ({
  ...r,
  lastLogin: r.last_login || r.lastLogin,
  createdAt: r.created_at || r.createdAt,
})
const normAct  = r => ({
  ...r,
  id:        String(r.id),
  userName:  r.user_name  || r.userName  || 'System',
  createdAt: r.created_at || r.createdAt || now(),
  urgent:    Boolean(r.urgent),
  action:    r.action || '',
  type:      r.type   || 'System',
})

function zoneGPS(zone, spread = 0.004) {
  const base = ZONE_COORDS[zone] || { lat: 8.492, lng: 124.650 }
  return {
    lat: base.lat + (Math.random() - 0.5) * spread,
    lng: base.lng + (Math.random() - 0.5) * spread,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export function useLocalData() {
  const [incidents,   setIncidents]   = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [evacCenters, setEvacCenters] = useState([])
  const [residents,   setResidents]   = useState([])
  const [resources,   setResources]   = useState([])
  const [users,       setUsers]       = useState([])
  const [activityLog, setActivityLog] = useState([])

  // ── API helper ────────────────────────────────────────────────────────────
  const apiCall = useCallback(async (endpoint, method = 'GET', body = null) => {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    if (body !== null) options.body = JSON.stringify(body)
    const res = await fetch(`${API_URL}${endpoint}`, options)
    if (method === 'DELETE' && res.status === 204) return null
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`API ${res.status}: ${text}`)
    }
    return res.json()
  }, [])

  // ── Load all data from backend ────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    const safe = async (fn) => { try { return await fn() } catch (e) { console.warn(e); return [] } }

    const [inc, alt, evac, res, rsc, usr, log] = await Promise.all([
      safe(() => apiCall('/incidents/')),
      safe(() => apiCall('/alerts/')),
      safe(() => apiCall('/evacuation-centers/')),
      safe(() => apiCall('/residents/')),
      safe(() => apiCall('/resources/')),
      safe(() => apiCall('/users/')),
      safe(() => apiCall('/activity-log/')),
    ])

    const arr = x => (Array.isArray(x) ? x : (x?.results || []))

    setIncidents(  arr(inc).map(normInc))
    setAlerts(     arr(alt))
    setEvacCenters(arr(evac).map(normEvac))
    setResidents(  arr(res).map(normRes))
    setResources(  arr(rsc))
    setActivityLog(arr(log).map(normAct))

    const usersArr = arr(usr)
    setUsers(usersArr.length > 0 ? usersArr.map(normUser) : [{
      id: 'local1', name: 'Admin User', email: 'admin@kauswagan.gov.ph',
      role: 'Admin', status: 'Active',
    }])
  }, [apiCall])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Activity log ──────────────────────────────────────────────────────────
  const log = useCallback((action, type, userName = 'System', urgent = false) => {
    const entry = { id: nextId(), action, type, userName, urgent, createdAt: now() }
    setActivityLog(prev => [entry, ...prev].slice(0, 500))
    apiCall('/activity-log/', 'POST', { action, type, user_name: userName, urgent })
      .catch(e => console.warn('log error:', e))
  }, [apiCall])

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  const loginUser = useCallback(async (email, password) => {
    try {
      const res = await apiCall('/auth/login/', 'POST', { email: email.trim(), password })
      if (res.ok) {
        log(`User signed in: ${res.user.name}`, 'Auth', res.user.name)
        return { success: true, user: res.user }
      }
      return { success: false, error: res.msg || 'Invalid email or password.' }
    } catch (e) {
      // Fallback: check locally loaded users
      const local = users.find(u =>
        u.email?.toLowerCase() === email.toLowerCase() && u.status === 'Active'
      )
      if (local) {
        log(`User signed in (local): ${local.name}`, 'Auth', local.name)
        return { success: true, user: { id: local.id, name: local.name, email: local.email, role: local.role } }
      }
      return { success: false, error: 'Cannot connect to server. Check your connection.' }
    }
  }, [apiCall, log, users])

  // ── INCIDENTS ────────────────────────────────────────────────────────────
  const addIncident = useCallback(async (data, userName = 'System') => {
    const gps = zoneGPS(data.zone)
    const payload = {
      type:        data.type,
      zone:        data.zone,
      location:    data.location    || '',
      severity:    data.severity    || 'Medium',
      status:      data.status      || 'Pending',
      description: data.description || '',
      reporter:    data.reporter    || '',
      source:      'web',
      lat:         gps.lat,
      lng:         gps.lng,
    }
    try {
      const rec = await apiCall('/incidents/', 'POST', payload)
      setIncidents(prev => [normInc(rec), ...prev])
      log(`Incident reported: ${data.type} in ${data.zone}`, 'Incident', userName, data.severity === 'High')
      return rec
    } catch (e) {
      // Optimistic local fallback
      const rec = { id: nextId(), ...payload, date_reported: now(), created_at: now() }
      setIncidents(prev => [normInc(rec), ...prev])
      log(`Incident reported: ${data.type} in ${data.zone}`, 'Incident', userName, data.severity === 'High')
      return rec
    }
  }, [apiCall, log])

  const updateIncident = useCallback(async (id, data, userName = 'System') => {
    try {
      const rec = await apiCall(`/incidents/${id}/`, 'PATCH', data)
      setIncidents(prev => prev.map(r => r.id === id ? normInc(rec) : r))
    } catch (e) {
      setIncidents(prev => prev.map(r => r.id === id ? normInc({ ...data, id, created_at: r.createdAt }) : r))
    }
    log(`Incident updated`, 'Incident', userName)
  }, [apiCall, log])

  const deleteIncident = useCallback(async (id, label = '', userName = 'System') => {
    try { await apiCall(`/incidents/${id}/`, 'DELETE') } catch (e) { console.warn(e) }
    setIncidents(prev => prev.filter(r => r.id !== id))
    log(`Incident deleted: ${label}`, 'Incident', userName, true)
  }, [apiCall, log])

  // ── ALERTS ───────────────────────────────────────────────────────────────
  const addAlert = useCallback(async (data, userName = 'System') => {
    const payload = {
      title:            data.title || `${data.level} Alert — ${data.zone}`,
      message:          data.message,
      level:            data.level,
      zone:             data.zone,
      channel:          data.channel          || 'Web',
      recipients_count: data.recipients_count || 0,
      sent_by:          userName,
    }
    try {
      const rec = await apiCall('/alerts/', 'POST', payload)
      setAlerts(prev => [rec, ...prev])
      log(`${data.level} alert sent to ${data.zone}`, 'Alert', userName, data.level === 'Danger')
      return rec
    } catch (e) {
      const rec = { id: nextId(), ...payload, sent_at: now(), created_at: now() }
      setAlerts(prev => [rec, ...prev])
      log(`${data.level} alert sent to ${data.zone}`, 'Alert', userName, data.level === 'Danger')
      return rec
    }
  }, [apiCall, log])

  const deleteAlert = useCallback(async (id, userName = 'System') => {
    try { await apiCall(`/alerts/${id}/`, 'DELETE') } catch (e) { console.warn(e) }
    setAlerts(prev => prev.filter(r => r.id !== id))
    log('Alert deleted', 'Alert', userName)
  }, [apiCall, log])

  // ── EVAC CENTERS ─────────────────────────────────────────────────────────
  const addEvacCenter = useCallback(async (data, userName = 'System') => {
    const gps = zoneGPS(data.zone, 0.003)
    const payload = {
      name:                 data.name,
      zone:                 data.zone,
      address:              data.address       || '',
      capacity:             parseInt(data.capacity)  || 100,
      occupancy:            parseInt(data.occupancy) || 0,
      status:               data.status        || 'Open',
      facilities_available: data.facilitiesAvailable || [],
      contact_person:       data.contactPerson  || '',
      contact:              data.contact        || '',
      lat:                  data.lat || gps.lat,
      lng:                  data.lng || gps.lng,
    }
    try {
      const rec = await apiCall('/evacuation-centers/', 'POST', payload)
      setEvacCenters(prev => [...prev, normEvac(rec)])
      log(`Evacuation center added: ${data.name}`, 'Evacuation', userName)
      return rec
    } catch (e) {
      const rec = { id: nextId(), ...payload, created_at: now() }
      setEvacCenters(prev => [...prev, normEvac(rec)])
      log(`Evacuation center added: ${data.name}`, 'Evacuation', userName)
      return rec
    }
  }, [apiCall, log])

  const updateEvacCenter = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:                 data.name,
      zone:                 data.zone,
      address:              data.address       || '',
      capacity:             parseInt(data.capacity)  || 0,
      occupancy:            parseInt(data.occupancy) || 0,
      status:               data.status        || 'Open',
      facilities_available: data.facilitiesAvailable || [],
      contact_person:       data.contactPerson  || '',
      contact:              data.contact        || '',
    }
    try {
      const rec = await apiCall(`/evacuation-centers/${id}/`, 'PATCH', payload)
      setEvacCenters(prev => prev.map(r => r.id === id ? normEvac(rec) : r))
    } catch (e) {
      setEvacCenters(prev => prev.map(r => r.id === id ? normEvac({ ...data, id }) : r))
    }
    log(`Evacuation center updated: ${data.name}`, 'Evacuation', userName)
  }, [apiCall, log])

  const deleteEvacCenter = useCallback(async (id, name = '', userName = 'System') => {
    try { await apiCall(`/evacuation-centers/${id}/`, 'DELETE') } catch (e) { console.warn(e) }
    setEvacCenters(prev => prev.filter(r => r.id !== id))
    log(`Evacuation center deleted: ${name}`, 'Evacuation', userName, true)
  }, [apiCall, log])

  // ── RESIDENTS (Web: view + edit only, no add) ────────────────────────────
  const updateResident = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:               data.name,
      zone:               data.zone,
      address:            data.address || '',
      household_members:  parseInt(data.householdMembers || data.household_members) || 1,
      contact:            data.contact || '',
      evacuation_status:  data.evacuationStatus || data.evacuation_status || 'Safe',
      vulnerability_tags: data.vulnerabilityTags || data.vulnerability_tags || [],
      notes:              data.notes || '',
    }
    try {
      const rec = await apiCall(`/residents/${id}/`, 'PATCH', payload)
      setResidents(prev => prev.map(r => r.id === id ? normRes(rec) : r))
    } catch (e) {
      setResidents(prev => prev.map(r => r.id === id ? normRes({ ...data, id }) : r))
    }
    log(`Resident updated: ${data.name}`, 'Resident', userName)
  }, [apiCall, log])

  const deleteResident = useCallback(async (id, name = '', userName = 'System') => {
    try { await apiCall(`/residents/${id}/`, 'DELETE') } catch (e) { console.warn(e) }
    setResidents(prev => prev.filter(r => r.id !== id))
    log(`Resident deleted: ${name}`, 'Resident', userName, true)
  }, [apiCall, log])

  // Web cannot add residents — this is a no-op that shows an error
  const addResident = useCallback(async () => {
    throw new Error('Residents can only be added from the mobile app.')
  }, [])

  // ── RESOURCES ────────────────────────────────────────────────────────────
  const addResource = useCallback(async (data, userName = 'System') => {
    const payload = {
      name:      data.name,
      category:  data.category,
      quantity:  parseInt(data.quantity)  || 1,
      available: parseInt(data.available) || parseInt(data.quantity) || 1,
      unit:      data.unit     || 'pcs',
      location:  data.location || '',
      status:    data.status   || 'Available',
      notes:     data.notes    || '',
    }
    try {
      const rec = await apiCall('/resources/', 'POST', payload)
      setResources(prev => [...prev, rec])
      log(`Resource added: ${data.name}`, 'Resource', userName)
      return rec
    } catch (e) {
      const rec = { id: nextId(), ...payload, created_at: now() }
      setResources(prev => [...prev, rec])
      log(`Resource added: ${data.name}`, 'Resource', userName)
      return rec
    }
  }, [apiCall, log])

  const updateResource = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:      data.name,
      category:  data.category,
      quantity:  parseInt(data.quantity)  || 0,
      available: parseInt(data.available) || 0,
      unit:      data.unit     || 'pcs',
      location:  data.location || '',
      status:    data.status   || 'Available',
      notes:     data.notes    || '',
    }
    try {
      const rec = await apiCall(`/resources/${id}/`, 'PATCH', payload)
      setResources(prev => prev.map(r => r.id === id ? rec : r))
    } catch (e) {
      setResources(prev => prev.map(r => r.id === id ? { ...data, id } : r))
    }
    log(`Resource updated: ${data.name || ''}`, 'Resource', userName)
  }, [apiCall, log])

  const deleteResource = useCallback(async (id, name = '', userName = 'System') => {
    try { await apiCall(`/resources/${id}/`, 'DELETE') } catch (e) { console.warn(e) }
    setResources(prev => prev.filter(r => r.id !== id))
    log(`Resource deleted: ${name}`, 'Resource', userName, true)
  }, [apiCall, log])

  // ── USERS ────────────────────────────────────────────────────────────────
  const addUser = useCallback(async (data, userName = 'System') => {
    const payload = {
      name:     data.name,
      email:    data.email,
      password: data.password || 'changeme123',
      role:     data.role     || 'Staff',
      status:   data.status   || 'Active',
    }
    try {
      const rec = await apiCall('/users/', 'POST', payload)
      setUsers(prev => [...prev, normUser(rec)])
      log(`User account created: ${data.name}`, 'User', userName)
      return rec
    } catch (e) {
      const rec = { id: nextId(), ...payload, created_at: now() }
      setUsers(prev => [...prev, normUser(rec)])
      log(`User account created: ${data.name}`, 'User', userName)
      return rec
    }
  }, [apiCall, log])

  const updateUser = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:   data.name,
      email:  data.email,
      role:   data.role   || 'Staff',
      status: data.status || 'Active',
      ...(data.password ? { password: data.password } : {}),
    }
    try {
      const rec = await apiCall(`/users/${id}/`, 'PATCH', payload)
      setUsers(prev => prev.map(r => r.id === id ? normUser(rec) : r))
    } catch (e) {
      setUsers(prev => prev.map(r => r.id === id ? { ...data, id } : r))
    }
    log(`User updated: ${data.name || ''}`, 'User', userName)
  }, [apiCall, log])

  const deleteUser = useCallback(async (id, name = '', userName = 'System') => {
    try { await apiCall(`/users/${id}/`, 'DELETE') } catch (e) { console.warn(e) }
    setUsers(prev => prev.filter(r => r.id !== id))
    log(`User deleted: ${name}`, 'User', userName, true)
  }, [apiCall, log])

  return {
    loading: false,
    dbError: null,
    refresh: loadAll,
    incidents,
    alerts,
    evacCenters,
    residents,
    resources,
    users,
    activityLog,
    loginUser,
    addIncident,    updateIncident,    deleteIncident,
    addAlert,                          deleteAlert,
    addEvacCenter,  updateEvacCenter,  deleteEvacCenter,
    addResident,    updateResident,    deleteResident,
    addResource,    updateResource,    deleteResource,
    addUser,        updateUser,        deleteUser,
  }
}
