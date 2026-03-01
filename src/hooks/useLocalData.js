// ─── useLocalData.js ──────────────────────────────────────────────────────────
// Supabase-backed data store. All CRUD goes directly to the database.

import { useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ZONE_COORDS } from '../data/zones'

let _id = 1000
const nextId = () => String(++_id)

// ── Field normalizers (DB snake_case → JS camelCase) ─────────────────────────
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

const withTimeout = (p, ms = 10000) => Promise.race([
  p,
  new Promise((_, r) => setTimeout(() => r(new Error('DB timeout')), ms))
])

function zoneGPS(zone, spread = 0.005) {
  const base = ZONE_COORDS[zone] || { lat: 8.492, lng: 124.650 }
  return {
    lat: base.lat + (Math.random() - 0.5) * spread,
    lng: base.lng + (Math.random() - 0.5) * spread,
  }
}

const now = () => new Date().toISOString()

// ─────────────────────────────────────────────────────────────────────────────
export function useLocalData() {
  const [incidents,   setIncidents]   = useState([])
  const [alerts,      setAlerts]      = useState([])
  const [evacCenters, setEvacCenters] = useState([])
  const [residents,   setResidents]   = useState([])
  const [resources,   setResources]   = useState([])
  const [users,       setUsers]       = useState([])
  const [activityLog, setActivityLog] = useState([])

  // ── Load all tables from Supabase ────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        withTimeout(supabase.from('incidents').select('*').order('created_at', { ascending: false })),
        withTimeout(supabase.from('alerts').select('*').order('created_at', { ascending: false })),
        withTimeout(supabase.from('evac_centers').select('*')),
        withTimeout(supabase.from('residents').select('*').order('created_at', { ascending: false })),
        withTimeout(supabase.from('resources').select('*')),
        withTimeout(supabase.from('users').select('*')),
        withTimeout(supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(500)),
      ])

      const [incR, alR, ecR, resR, rsR, usR, alogR] = results

      const inc  = incR.status  === 'fulfilled' ? (incR.value.data  || []) : []
      const al   = alR.status   === 'fulfilled' ? (alR.value.data   || []) : []
      const ec   = ecR.status   === 'fulfilled' ? (ecR.value.data   || []) : []
      const res  = resR.status  === 'fulfilled' ? (resR.value.data  || []) : []
      const rs   = rsR.status   === 'fulfilled' ? (rsR.value.data   || []) : []
      let   us   = usR.status   === 'fulfilled' ? (usR.value.data   || []) : []
      const alog = alogR.status === 'fulfilled' ? (alogR.value.data || []) : []

      // if the users table is legitimately empty, seed default accounts
      if (us.length === 0) {
        const { data: seeded, error: seedErr } = await supabase.from('users').insert([
          { name: 'Admin User',    email: 'admin@kauswagan.gov.ph',  password: 'admin123',  role: 'Admin', status: 'Active' },
          { name: 'Staff Officer', email: 'staff@kauswagan.gov.ph',  password: 'staff123',  role: 'Staff', status: 'Active' },
        ]).select()
        if (seedErr) throw seedErr
        us = seeded || []
      }

      setIncidents(inc.map(normInc))
      setAlerts(al)
      setEvacCenters(ec.map(normEvac))
      setResidents(res.map(normRes))
      setResources(rs)
      setUsers(us.map(normUser))
      setActivityLog(alog.map(normAct))
    } catch (e) {
      console.error('Database loadAll failed, cannot fall back to local data:', e)
      // optionally you could alert the user or redirect to an error page
      throw e // bubble up so the app knows connection is broken
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Activity log helper ───────────────────────────────────────────────────
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

    supabase.from('activity_log')
      .insert([{ action, type, user_name: userName, urgent }])
      .then(({ error }) => { if (error) console.warn('activity_log insert error:', error) })
      .catch(e => console.warn('activity_log error:', e))
  }, [])

  // ── INCIDENTS ──────────────────────────────────────────────────────────────
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
    const { data: record, error } = await supabase.from('incidents').insert([payload]).select().single()
    if (error) throw error
    setIncidents(prev => [normInc(record), ...prev])
    log(`Incident reported: ${data.type} in ${data.zone}`, 'Incident', userName, data.severity === 'High')
    return record
  }, [log])

  const updateIncident = useCallback(async (id, data, userName = 'System') => {
    // only send fields that actually exist in the database
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
    const { data: record, error } = await supabase.from('incidents').update(payload).eq('id', id).select().single()
    if (error) throw error
    setIncidents(prev => prev.map(r => r.id === id ? normInc(record) : r))
    log(`Incident updated: ${data.type || ''} ${data.zone || ''}`.trim(), 'Incident', userName)
    return record
  }, [log])

  const deleteIncident = useCallback(async (id, label = '', userName = 'System') => {
    const { error } = await supabase.from('incidents').delete().eq('id', id)
    if (error) throw error
    setIncidents(prev => prev.filter(r => r.id !== id))
    log(`Incident deleted: ${label}`, 'Incident', userName, true)
  }, [log])

  // ── ALERTS ─────────────────────────────────────────────────────────────────
  const addAlert = useCallback(async (data, userName = 'System') => {
    const payload = {
      title:            `${data.level} Alert — ${data.zone}`,
      message:          data.message,
      level:            data.level,
      zone:             data.zone,
      channel:          data.channel || 'Web',
      recipients_count: data.zone === 'All Zones' ? 1284 : Math.floor(Math.random() * 300 + 150),
      sent_by:          userName,
    }
    const { data: record, error } = await supabase.from('alerts').insert([payload]).select().single()
    if (error) throw error
    setAlerts(prev => [record, ...prev])
    log(`${data.level} alert sent to ${data.zone}`, 'Alert', userName, data.level === 'Danger')
    return record
  }, [log])

  const deleteAlert = useCallback(async (id, userName = 'System') => {
    const { error } = await supabase.from('alerts').delete().eq('id', id)
    if (error) throw error
    setAlerts(prev => prev.filter(r => r.id !== id))
    log('Alert deleted', 'Alert', userName)
  }, [log])

  // ── EVAC CENTERS ───────────────────────────────────────────────────────────
  const addEvacCenter = useCallback(async (data, userName = 'System') => {
    const gps = zoneGPS(data.zone, 0.003)
    const payload = {
      name:                 data.name,
      zone:                 data.zone,
      address:              data.address || '',
      capacity:             parseInt(data.capacity) || 100,
      occupancy:            parseInt(data.occupancy) || 0,
      status:               data.status || 'Open',
      facilities_available: data.facilitiesAvailable || [],
      contact_person:       data.contactPerson || '',
      contact:              data.contact || '',
      lat:                  data.lat || gps.lat,
      lng:                  data.lng || gps.lng,
    }
    const { data: record, error } = await supabase.from('evac_centers').insert([payload]).select().single()
    if (error) throw error
    setEvacCenters(prev => [...prev, normEvac(record)])
    log(`Evacuation center added: ${data.name}`, 'Evacuation', userName)
    return record
  }, [log])

  const updateEvacCenter = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:                 data.name,
      zone:                 data.zone,
      address:              data.address,
      capacity:             parseInt(data.capacity) || 100,
      occupancy:            parseInt(data.occupancy) || 0,
      status:               data.status,
      facilities_available: data.facilitiesAvailable || [],
      contact_person:       data.contactPerson || '',
      contact:              data.contact || '',
    }
    const { data: record, error } = await supabase.from('evac_centers').update(payload).eq('id', id).select().single()
    if (error) throw error
    setEvacCenters(prev => prev.map(r => r.id === id ? normEvac(record) : r))
    log(`Evacuation center updated: ${data.name}`, 'Evacuation', userName)
    return record
  }, [log])

  const deleteEvacCenter = useCallback(async (id, name = '', userName = 'System') => {
    const { error } = await supabase.from('evac_centers').delete().eq('id', id)
    if (error) throw error
    setEvacCenters(prev => prev.filter(r => r.id !== id))
    log(`Evacuation center deleted: ${name}`, 'Evacuation', userName, true)
  }, [log])

  // ── RESIDENTS ──────────────────────────────────────────────────────────────
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
    const { data: record, error } = await supabase.from('residents').insert([payload]).select().single()
    if (error) throw error
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
    const { data: record, error } = await supabase.from('residents').update(payload).eq('id', id).select().single()
    if (error) throw error
    setResidents(prev => prev.map(r => r.id === id ? normRes(record) : r))
    log(`Resident updated: ${data.name} (${data.zone})`, 'Resident', userName)
    return record
  }, [log])

  const deleteResident = useCallback(async (id, name = '', userName = 'System') => {
    const { error } = await supabase.from('residents').delete().eq('id', id)
    if (error) throw error
    setResidents(prev => prev.filter(r => r.id !== id))
    log(`Resident deleted: ${name}`, 'Resident', userName, true)
  }, [log])

  // ── RESOURCES ──────────────────────────────────────────────────────────────
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
    const { data: record, error } = await supabase.from('resources').insert([payload]).select().single()
    if (error) throw error
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
    const { data: record, error } = await supabase.from('resources').update(payload).eq('id', id).select().single()
    if (error) throw error
    setResources(prev => prev.map(r => r.id === id ? record : r))
    log(`Resource updated: ${data.name || ''}`, 'Resource', userName)
    return record
  }, [log])

  const deleteResource = useCallback(async (id, name = '', userName = 'System') => {
    const { error } = await supabase.from('resources').delete().eq('id', id)
    if (error) throw error
    setResources(prev => prev.filter(r => r.id !== id))
    log(`Resource deleted: ${name}`, 'Resource', userName, true)
  }, [log])

  // ── USERS ──────────────────────────────────────────────────────────────────
  const addUser = useCallback(async (data, userName = 'System') => {
    const payload = {
      name:     data.name,
      email:    data.email,
      password: data.password || 'changeme123',
      role:     data.role || 'Staff',
      status:   'Active',
    }
    const { data: record, error } = await supabase.from('users').insert([payload]).select().single()
    if (error) throw error
    setUsers(prev => [...prev, normUser(record)])
    log(`User account created: ${data.name}`, 'User', userName)
    return record
  }, [log])

  const updateUser = useCallback(async (id, data, userName = 'System') => {
    const payload = {
      name:   data.name,
      email:  data.email,
      password: data.password,
      role:   data.role,
      status: data.status,
    }
    const { data: record, error } = await supabase.from('users').update(payload).eq('id', id).select().single()
    if (error) throw error
    setUsers(prev => prev.map(r => r.id === id ? normUser(record) : r))
    log(`User updated: ${data.name || ''}`, 'User', userName)
    return record
  }, [log])

  const deleteUser = useCallback(async (id, name = '', userName = 'System') => {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) throw error
    setUsers(prev => prev.filter(r => r.id !== id))
    log(`User deleted: ${name}`, 'User', userName, true)
  }, [log])

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const loginUser = useCallback(async (email, password) => {
    try {
      const { data: found, error } = await withTimeout(
        supabase.from('users')
          .select('*')
          .ilike('email', email.trim())
          .eq('password', password)
          .eq('status', 'Active')
          .single(),
        8000
      )
      if (error || !found) return { success: false, error: 'Invalid email or password.' }
      await supabase.from('users').update({ last_login: now() }).eq('id', found.id)
      log(`User signed in: ${found.name}`, 'Auth', found.name)
      return { success: true, user: { id: found.id, name: found.name, email: found.email, role: found.role } }
    } catch (e) {
      console.warn('loginUser error:', e)
      const local = users.find(u =>
        u.email?.toLowerCase() === email.toLowerCase() &&
        u.password === password &&
        u.status === 'Active'
      )
      if (local) return { success: true, user: { id: local.id, name: local.name, email: local.email, role: local.role } }
      return { success: false, error: 'Unable to reach database. Check your connection.' }
    }
  }, [log, users])

  return {
    loading: false, dbError: null, refresh: loadAll,
    incidents, alerts, evacCenters, residents, resources, users, activityLog,
    loginUser,
    addIncident, updateIncident, deleteIncident,
    addAlert, deleteAlert,
    addEvacCenter, updateEvacCenter, deleteEvacCenter,
    addResident, updateResident, deleteResident,
    addResource, updateResource, deleteResource,
    addUser, updateUser, deleteUser,
  }
}
