import { useState, useCallback, useEffect } from 'react'
import { ZONE_COORDS } from '../data/zones'

const API_URL = 'http://localhost:8000/api';

let _id = 1000
const nextId = () => String(++_id)


const normInc  = r => ({ ...r, dateReported: r.date_reported, createdAt: r.created_at })
const normEvac = r => ({ ...r, facilitiesAvailable: r.facilities_available || [], contactPerson: r.contact_person })
const normRes  = r => ({
  ...r,
  householdMembers:  r.household_members,
  evacuationStatus:  r.evacuation_status,
  vulnerabilityTags: r.vulnerability_tags || [],
  addedBy:           r.added_by,
  addedAt:           r.added_at,
  updatedAt:         r.updated_at,
})
const normUser = r => ({ ...r, lastLogin: r.last_login, createdAt: r.created_at })
const normAct  = r => ({
  ...r,
  id:        String(r.id),
  userName:  r.user_name || r.userName || 'System',
  createdAt: r.created_at || r.createdAt || new Date().toISOString(),
  urgent:    Boolean(r.urgent),
  action:    r.action || '',
  type:      r.type || 'System',
})

const now = () => new Date().toISOString()


async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API error ${res.status}: ${err}`)
  }
  if (res.status === 204) return null
  return res.json()
}

function zoneGPS(zone, spread = 0.005) {
  const base = ZONE_COORDS[zone] || { lat: 8.492, lng: 124.650 }
  return {
    lat: base.lat + (Math.random() - 0.5) * spread,
    lng: base.lng + (Math.random() - 0.5) * spread,
  }
}


export function useLocalData() {
  const [incidents,   setIncidents]   = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [evacCenters, setEvacCenters] = useState([])
  const [residents,   setResidents]   = useState([])
  const [resources,   setResources]   = useState([])
  const [users,       setUsers]       = useState([])
  const [activityLog, setActivityLog] = useState([])

  
  const loadAll = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api('/incidents/'),
        api('/alerts/'),
        api('/evacuation-centers/'),
        api('/residents/'),
        api('/resources/'),
        api('/users/'),
        api('/activity-log/'),
      ])

      const [incR, alR, ecR, resR, rsR, usR, alogR] = results

      const inc  = incR.status  === 'fulfilled' ? (incR.value  || []) : []
      const al   = alR.status   === 'fulfilled' ? (alR.value   || []) : []
      const ec   = ecR.status   === 'fulfilled' ? (ecR.value   || []) : []
      const res  = resR.status  === 'fulfilled' ? (resR.value  || []) : []
      const rs   = rsR.status   === 'fulfilled' ? (rsR.value   || []) : []
      let   us   = usR.status   === 'fulfilled' ? (usR.value   || []) : []
      const alog = alogR.status === 'fulfilled' ? (alogR.value || []) : []

      
      if (us.length === 0) {
        const seeded = await Promise.all([
          api('/users/', { method: 'POST', body: { name: 'Admin User',    email: 'admin@kauswagan.gov.ph',  password: 'admin123',  role: 'Admin', status: 'Active' } }),
          api('/users/', { method: 'POST', body: { name: 'Staff Officer', email: 'staff@kauswagan.gov.ph',  password: 'staff123',  role: 'Staff', status: 'Active' } }),
        ])
        us = seeded.filter(Boolean)
      }

      setIncidents(inc.map(normInc))
      setAlerts(al)
      setEvacCenters(ec.map(normEvac))
      setResidents(res.map(normRes))
      setResources(rs)
      setUsers(us.map(normUser))
      setActivityLog(alog.map(normAct))
    } catch (e) {
      console.error('Django API loadAll failed:', e)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  
  const fetchAlerts = useCallback(async () => {
    const data = await api('/alerts/')
    if (data) setAlerts(data)
  }, [])

  
  const log = useCallback((action, type, userName = 'System', urgent = false) => {
    const localEntry = {
      id:        nextId(),
      action,
      type,
      userName,
      urgent,
      createdAt: now(),
    }
    setActivityLog(prev => [localEntry, ...prev].slice(0, 500))

    api('/activity-log/', {
      method: 'POST',
      body: { action, type, user_name: userName, urgent },
    }).catch(e => console.warn('activity_log error:', e))
  }, [])

  
  const addIncident = useCallback(async (data, userName = 'System') => {
    const gps = zoneGPS(data.zone)
    const payload = {
      type:        data.type,
      zone:        data.zone,
      location:    data.location || '',
      severity:    data.severity || 'Medium',
      status:      'Pending',
      description: data.description || '',
      reporter:    data.reporter || '',
      source:      data.source || 'web',
      lat:         data.lat || gps.lat,
      lng:         data.lng || gps.lng,
    }
    const record = await api('/incidents/', { method: 'POST', body: payload })
    setIncidents(prev => [normInc(record), ...prev])
    log(`Incident reported: ${data.type} in ${data.zone}`, 'Incident', userName, data.severity === 'High')
    return record
  }, [log])

  const updateIncident = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      type:        data.type,
      zone:        data.zone,
      location:    data.location || '',
      severity:    data.severity || 'Medium',
      status:      data.status,
      description: data.description || '',
      reporter:    data.reporter || '',
      source:      data.source || 'web',
      lat:         data.lat,
      lng:         data.lng,
    }
    const record = await api(`/incidents/${id}/`, { method: 'PATCH', body: payload })
    setIncidents(prev => prev.map(r => r.id === id ? normInc(record) : r))
    log(`Incident updated: ${data.type || ''} ${data.zone || ''}`.trim(), 'Incident', userName)
    return record
  }, [log])

  const deleteIncident = useCallback(async (id, label = '', userName = 'System') => {
    await api(`/incidents/${id}/`, { method: 'DELETE' })
    setIncidents(prev => prev.filter(r => r.id !== id))
    log(`Incident deleted: ${label}`, 'Incident', userName, true)
  }, [log])

  
  const addAlert = useCallback(async (data, userName = 'System') => {
    const payload = {
      title:            data.title,
      message:          data.message || '',
      level:            data.level || 'Advisory',
      zone:             data.zone || 'All Zones',
      recipients_count: data.smsCount || data.recipients_count || 0,
      sent_by:          userName,
    }
    const record = await api('/alerts/', { method: 'POST', body: payload })
    setAlerts(prev => [record, ...prev])
    log(`Alert sent: ${data.title}`, 'Alert', userName, data.level === 'Danger')
    return record
  }, [log])

  const deleteAlert = useCallback(async (id, label = '', userName = 'System') => {
    await api(`/alerts/${id}/`, { method: 'DELETE' })
    setAlerts(prev => prev.filter(r => r.id !== id))
    log(`Alert deleted: ${label}`, 'Alert', userName, true)
  }, [log])

  
  const addEvacCenter = useCallback(async (data, userName = 'System') => {
    const payload = {
      name:                 data.name,
      zone:                 data.zone,
      address:              data.address || '',
      capacity:             parseInt(data.capacity) || 0,
      current_occupancy:    parseInt(data.currentOccupancy) || 0,
      status:               data.status || 'Available',
      facilities_available: data.facilitiesAvailable || [],
      contact_person:       data.contactPerson || '',
      contact_number:       data.contactNumber || '',
      lat:                  data.lat,
      lng:                  data.lng,
    }
    const record = await api('/evacuation-centers/', { method: 'POST', body: payload })
    setEvacCenters(prev => [...prev, normEvac(record)])
    log(`Evacuation center added: ${data.name}`, 'Evacuation', userName)
    return record
  }, [log])

  const updateEvacCenter = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:                 data.name,
      zone:                 data.zone,
      address:              data.address || '',
      capacity:             parseInt(data.capacity) || 0,
      current_occupancy:    parseInt(data.currentOccupancy) || 0,
      status:               data.status || 'Available',
      facilities_available: data.facilitiesAvailable || [],
      contact_person:       data.contactPerson || '',
      contact_number:       data.contactNumber || '',
    }
    const record = await api(`/evacuation-centers/${id}/`, { method: 'PATCH', body: payload })
    setEvacCenters(prev => prev.map(r => r.id === id ? normEvac(record) : r))
    log(`Evacuation center updated: ${data.name}`, 'Evacuation', userName)
    return record
  }, [log])

  const deleteEvacCenter = useCallback(async (id, name = '', userName = 'System') => {
    await api(`/evacuation-centers/${id}/`, { method: 'DELETE' })
    setEvacCenters(prev => prev.filter(r => r.id !== id))
    log(`Evacuation center deleted: ${name}`, 'Evacuation', userName, true)
  }, [log])

  
  const addResident = useCallback(async (data, userName = 'System') => {
    const gps = zoneGPS(data.zone, 0.003)
    const payload = {
      name:               data.name,
      zone:               data.zone,
      address:            data.address || '',
      household_members:  parseInt(data.householdMembers) || 1,
      contact:            data.contact || '',
      evacuation_status:  data.evacuationStatus || 'Safe',
      vulnerability_tags: data.vulnerabilityTags || [],
      lat:                data.lat || gps.lat,
      lng:                data.lng || gps.lng,
      notes:              data.notes || '',
      added_by:           userName,
      source:             data.source || 'web',
    }
    const record = await api('/residents/', { method: 'POST', body: payload })
    setResidents(prev => [normRes(record), ...prev])
    log(`Resident added: ${data.name} (${data.zone})`, 'Resident', userName)
    return record
  }, [log])

  const updateResident = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:               data.name,
      zone:               data.zone,
      address:            data.address || '',
      household_members:  parseInt(data.householdMembers) || 1,
      contact:            data.contact || '',
      evacuation_status:  data.evacuationStatus || 'Safe',
      vulnerability_tags: data.vulnerabilityTags || [],
      notes:              data.notes || '',
    }
    const record = await api(`/residents/${id}/`, { method: 'PATCH', body: payload })
    setResidents(prev => prev.map(r => r.id === id ? normRes(record) : r))
    log(`Resident updated: ${data.name} (${data.zone})`, 'Resident', userName)
    return record
  }, [log])

  const deleteResident = useCallback(async (id, name = '', userName = 'System') => {
    await api(`/residents/${id}/`, { method: 'DELETE' })
    setResidents(prev => prev.filter(r => r.id !== id))
    log(`Resident deleted: ${name}`, 'Resident', userName, true)
  }, [log])

  
  const addResource = useCallback(async (data, userName = 'System') => {
    const payload = {
      name:      data.name,
      category:  data.category,
      quantity:  parseInt(data.quantity) || 1,
      available: parseInt(data.available) || parseInt(data.quantity) || 1,
      unit:      data.unit || 'pcs',
      location:  data.location || '',
      status:    data.status || 'Available',
      notes:     data.notes || '',
    }
    const record = await api('/resources/', { method: 'POST', body: payload })
    setResources(prev => [...prev, record])
    log(`Resource added: ${data.name}`, 'Resource', userName)
    return record
  }, [log])

  const updateResource = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:      data.name,
      category:  data.category,
      quantity:  parseInt(data.quantity) || 0,
      available: parseInt(data.available) || 0,
      unit:      data.unit || 'pcs',
      location:  data.location || '',
      status:    data.status || 'Available',
      notes:     data.notes || '',
    }
    const record = await api(`/resources/${id}/`, { method: 'PATCH', body: payload })
    setResources(prev => prev.map(r => r.id === id ? record : r))
    log(`Resource updated: ${data.name || ''}`, 'Resource', userName)
    return record
  }, [log])

  const deleteResource = useCallback(async (id, name = '', userName = 'System') => {
    await api(`/resources/${id}/`, { method: 'DELETE' })
    setResources(prev => prev.filter(r => r.id !== id))
    log(`Resource deleted: ${name}`, 'Resource', userName, true)
  }, [log])

  
  const addUser = useCallback(async (data, userName = 'System') => {
    const payload = {
      name:     data.name,
      email:    data.email,
      password: data.password || 'changeme123',
      role:     data.role || 'Staff',
      status:   'Active',
    }
    const record = await api('/users/', { method: 'POST', body: payload })
    setUsers(prev => [...prev, normUser(record)])
    log(`User account created: ${data.name}`, 'User', userName)
    return record
  }, [log])

  const updateUser = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:     data.name,
      email:    data.email,
      password: data.password,
      role:     data.role,
      status:   data.status,
    }
    const record = await api(`/users/${id}/`, { method: 'PATCH', body: payload })
    setUsers(prev => prev.map(r => r.id === id ? normUser(record) : r))
    log(`User updated: ${data.name || ''}`, 'User', userName)
    return record
  }, [log])

  const deleteUser = useCallback(async (id, name = '', userName = 'System') => {
    await api(`/users/${id}/`, { method: 'DELETE' })
    setUsers(prev => prev.filter(r => r.id !== id))
    log(`User deleted: ${name}`, 'User', userName, true)
  }, [log])

  
  const loginUser = useCallback(async (email, password) => {
    try {
      const data = await api('/auth/login/', {
        method: 'POST',
        body: { email: email.trim(), password },
      })
      if (!data || !data.user) return { success: false, error: 'Invalid email or password.' }
      log(`User signed in: ${data.user.name}`, 'Auth', data.user.name)
      return { success: true, user: data.user }
    } catch (e) {
      console.warn('loginUser error:', e)
      return { success: false, error: 'Unable to reach server. Make sure Django is running.' }
    }
  }, [log])

  return {
    loading: false, dbError: null, refresh: loadAll,
    incidents, alerts, evacCenters, residents, resources, users, activityLog,
    loginUser,
    fetchAlerts,
    addIncident, updateIncident, deleteIncident,
    addAlert, deleteAlert,
    addEvacCenter, updateEvacCenter, deleteEvacCenter,
    addResident, updateResident, deleteResident,
    addResource, updateResource, deleteResource,
    addUser, updateUser, deleteUser,
  }
}