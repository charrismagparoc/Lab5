import { useState, useRef, useEffect } from 'react'
import { ConfirmModal } from '../components/Shared'
import { useApp } from '../context/AppContext'
import '../styles/pages/alerts.css'  // styles

const ALL_ZONES  = ['All Zones','Zone 1','Zone 2','Zone 3','Zone 4','Zone 5','Zone 6']
const LVL_COLOR  = { Danger:'var(--red)', Warning:'var(--orange)', Advisory:'var(--blue)', Resolved:'var(--green)' }
const LVL_CLS    = { Danger:'bd-danger', Warning:'bd-warning', Advisory:'bd-info', Resolved:'bd-success' }
const LVL_BG_CLS = { Danger:'alert-card-danger', Warning:'alert-card-warning', Advisory:'alert-card-advisory', Resolved:'' }

const QUICK = [
  { label:'Flood Warning',    zone:'Zone 3',    level:'Danger',   msg:'FLOOD WARNING: Water level critically high in Zone 3. Immediate evacuation required. Proceed to nearest evacuation center now.' },
  { label:'Evacuation Order', zone:'All Zones', level:'Danger',   msg:'MANDATORY EVACUATION: All residents in high-risk zones must proceed to the nearest evacuation center immediately. Bring essential documents and medicine.' },
  { label:'Storm Advisory',   zone:'All Zones', level:'Advisory', msg:'STORM ADVISORY: Prepare emergency kits. Strong winds and heavy rain expected within 12 hours. Secure your homes and stay indoors.' },
  { label:'All Clear',        zone:'All Zones', level:'Resolved', msg:'ALL CLEAR: The threat has passed. Residents may return home. Exercise caution with debris and damaged structures.' },
]

// Semaphore SMS Gateway
const SEMAPHORE_API_KEY = import.meta.env.VITE_SEMAPHORE_KEY || ''
const SENDER_NAME = 'BDRRMC'

async function sendSMS(numbers, message) {
  const recipients = numbers.join(',')
  const payload = new URLSearchParams({
    apikey: SEMAPHORE_API_KEY,
    number: recipients,
    message,
    sendername: SENDER_NAME,
  })
  const res = await fetch('https://api.semaphore.co/api/v4/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: payload.toString(),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`SMS failed (${res.status}): ${body}`)
  }
  return await res.json()
}

function validatePH(num) {
  const clean = num.replace(/[\s\-]/g, '')
  return /^(09|\+639)\d{9}$/.test(clean)
}

// ── Resident Multi-Select Dropdown ────────────────────────────────────────────
function ResidentSmsDropdown({ residents, selectedIds, onChange }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref                 = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Only show residents that have a contact number
  const eligible = residents.filter(r => r.contact && r.contact.trim())
  const filtered = eligible.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    (r.zone || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.contact || '').includes(search)
  )

  const toggleResident = id => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id))
    else onChange([...selectedIds, id])
  }

  const toggleAll = () => {
    if (selectedIds.length === eligible.length) onChange([])
    else onChange(eligible.map(r => r.id))
  }

  const selectedResidents = residents.filter(r => selectedIds.includes(r.id))
  const allSelected = eligible.length > 0 && selectedIds.length === eligible.length

  return (
    <div ref={ref} className="sms-dropdown-wrap">

      {/* ── Trigger ── */}
      <div className="form-ctrl sms-dropdown-trigger" onClick={() => setOpen(o => !o)}>
        <div className="sms-trigger-chips">
          {selectedResidents.length === 0 ? (
            <span className="sms-trigger-placeholder">Select residents to receive SMS…</span>

          ) : selectedResidents.length <= 3 ? (
            selectedResidents.map(r => (
              <span key={r.id} className="sms-chip">
                {r.name}
                <span
                  className="sms-chip-remove"
                  onClick={e => { e.stopPropagation(); toggleResident(r.id) }}
                >✕</span>
              </span>
            ))

          ) : (
            <span className="sms-chip-count">{selectedResidents.length} residents selected</span>
          )}
        </div>
        <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'} sms-trigger-chevron`} />
      </div>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="sms-dropdown-panel">

          {/* Search bar */}
          <div className="sms-search-bar">
            <div className="sms-search-inner">
              <i className="fa-solid fa-magnifying-glass sms-search-icon" />
              <input
                autoFocus
                className="form-ctrl sms-search-input"
                placeholder="Search residents…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Select All row */}
          {eligible.length > 0 && (
            <div
              className={`sms-select-all${allSelected ? ' all-selected' : ''}`}
              onClick={e => { e.stopPropagation(); toggleAll() }}
            >
              <span className={`sms-checkbox${allSelected ? ' checked' : ''}`}>
                {allSelected && <i className="fa-solid fa-check sms-checkbox-icon" />}
              </span>
              Select All ({eligible.length} with contact)
            </div>
          )}

          {/* Resident list */}
          <div className="sms-resident-list">
            {filtered.length === 0 ? (
              <div className="sms-empty-msg">
                {eligible.length === 0
                  ? 'No residents with contact numbers found.'
                  : 'No residents match your search.'}
              </div>
            ) : (
              filtered.map(r => {
                const checked = selectedIds.includes(r.id)
                return (
                  <div
                    key={r.id}
                    className={`sms-resident-row${checked ? ' row-checked' : ''}`}
                    onClick={e => { e.stopPropagation(); toggleResident(r.id) }}
                  >
                    {/* Checkbox */}
                    <span className={`sms-checkbox${checked ? ' checked' : ''}`}>
                      {checked && <i className="fa-solid fa-check sms-checkbox-icon" />}
                    </span>

                    {/* Avatar */}
                    <span className={`sms-avatar${checked ? ' avatar-checked' : ''}`}>
                      {r.name.charAt(0).toUpperCase()}
                    </span>

                    {/* Info */}
                    <div className="sms-resident-info">
                      <div className="sms-resident-name">{r.name}</div>
                      <div className="sms-resident-sub">
                        {r.zone} · <span className="sms-resident-contact">{r.contact}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <span className={`badge ${{ Safe:'bd-success', Evacuated:'bd-info', Unaccounted:'bd-danger' }[r.evacuationStatus] || ''}`}>
                      {r.evacuationStatus}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          {selectedIds.length > 0 && (
            <div className="sms-dropdown-footer">
              <span className="sms-footer-count">
                <i className="fa-solid fa-mobile-screen" />
                {selectedIds.length} recipient{selectedIds.length !== 1 ? 's' : ''} selected
              </span>
              <button
                className="sms-clear-all"
                onClick={e => { e.stopPropagation(); onChange([]) }}
                type="button"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AlertsPage() {
  const { alerts, addAlert, deleteAlert, residents = [] } = useApp()
  const [showModal,      setShowModal]      = useState(false)
  const [form,           setForm]           = useState({ level:'Advisory', zone:'All Zones', message:'' })
  const [selectedResIds, setSelectedResIds] = useState([])
  const [sending,        setSending]        = useState(false)
  const [smsStatus,      setSmsStatus]      = useState(null)
  const [sent,           setSent]           = useState(false)
  const [deleteId,       setDeleteId]       = useState(null)
  const [sendErr,        setSendErr]        = useState('')

  const openModal = () => {
    setForm({ level:'Advisory', zone:'All Zones', message:'' })
    setSelectedResIds([])
    setSent(false); setSendErr(''); setSmsStatus(null)
    setShowModal(true)
  }
  const openQuick = q => {
    setForm({ level:q.level, zone:q.zone, message:q.msg })
    setSelectedResIds([])
    setSent(false); setSendErr(''); setSmsStatus(null)
    setShowModal(true)
  }

  const handleSend = async () => {
    if (!form.message.trim()) { setSendErr('Message is required.'); return }
    setSendErr('')
    setSending(true)

    try {
      await addAlert({ ...form, title: form.level + ' Alert — ' + form.zone })
    } catch (e) {
      setSendErr(e.message)
      setSending(false)
      return
    }

    if (selectedResIds.length > 0) {
      const selectedResidents = residents.filter(r => selectedResIds.includes(r.id))
      const numList = selectedResidents.map(r => r.contact.trim()).filter(Boolean)
      const invalid = numList.filter(n => !validatePH(n))

      if (invalid.length > 0) {
        setSendErr(`Invalid number format for some residents: ${invalid.join(', ')}`)
        setSending(false)
        return
      }

      if (!SEMAPHORE_API_KEY) {
        setSmsStatus('no-key')
      } else {
        setSmsStatus('sending')
        try {
          const smsMsg = `[BDRRMC KAUSWAGAN] ${form.level.toUpperCase()} - ${form.zone}\n${form.message}`
          await sendSMS(numList, smsMsg)
          setSmsStatus('sent')
        } catch (e) {
          setSmsStatus('failed')
          console.warn('SMS error:', e.message)
        }
      }
    }

    setSent(true)
    setSending(false)
    setTimeout(() => { setShowModal(false); setSent(false); setSmsStatus(null) }, 2500)
  }

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Alert System</div>
          <div className="page-sub">Broadcast emergency alerts — send in-app notifications and SMS to residents</div>
        </div>
        <button className="btn btn-primary" onClick={openModal} type="button">
          <i className="fa-solid fa-bullhorn"></i> Send Alert
        </button>
      </div>

      {/* Stats */}
      <div className="alert-stats-grid">
        {[
          ['Total Sent', alerts.length,                                'var(--blue)'],
          ['Danger',     alerts.filter(a=>a.level==='Danger').length,  'var(--red)'],
          ['Warning',    alerts.filter(a=>a.level==='Warning').length, 'var(--orange)'],
          ['Advisory',   alerts.filter(a=>a.level==='Advisory').length,'var(--blue)'],
        ].map(([l,v,c]) => (
          <div key={l} className="card alert-stat-card">
            <div className="alert-stat-val" style={{ color: c }}>{v}</div>
            <div className="alert-stat-lbl">{l}</div>
          </div>
        ))}
      </div>

      {/* Quick broadcast */}
      <div className="card alert-quick-card">
        <div className="sec-title"><i className="fa-solid fa-bolt"></i> Quick Emergency Broadcast</div>
        <div className="alert-quick-btns">
          {QUICK.map(q => (
            <button key={q.label} className="btn btn-secondary" onClick={() => openQuick(q)} type="button">
              <i className={'fa-solid ' + (q.level==='Resolved' ? 'fa-circle-check' : 'fa-triangle-exclamation')}></i>
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Alert history */}
      <div className="sec-title">
        <i className="fa-solid fa-clock-rotate-left"></i> Alert History ({alerts.length})
      </div>
      {alerts.length === 0 ? (
        <div className="empty"><i className="fa-solid fa-bell-slash"></i><p>No alerts sent yet.</p></div>
      ) : (
        <div className="alert-list">
          {alerts.map(a => (
            <div key={a.id} className={'alert-card ' + (LVL_BG_CLS[a.level] || '')}>
              <div className="alert-card-inner">
                <i className="fa-solid fa-bell alert-card-icon" style={{ color: LVL_COLOR[a.level] || 'var(--blue)' }}></i>
                <div className="alert-card-body">
                  <div className="alert-card-top">
                    <span className={'badge ' + LVL_CLS[a.level]}>{a.level}</span>
                    <strong className="alert-card-title">{a.title || a.level + ' Alert'}</strong>
                    <span className="alert-card-zone">{a.zone}</span>
                  </div>
                  <div className="alert-card-msg">{a.message}</div>
                  <div className="alert-card-meta">
                    <span><i className="fa-solid fa-user"></i> {a.sent_by || a.sentBy}</span>
                    <span><i className="fa-solid fa-users"></i> {a.recipients_count || a.recipientsCount || 0} recipients</span>
                    <span><i className="fa-solid fa-clock"></i> {a.created_at || a.sentAt ? new Date(a.created_at || a.sentAt).toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</span>
                  </div>
                </div>
              </div>
              <button type="button" className="alert-del-btn" onClick={() => setDeleteId(a.id)}>
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteId && (
        <ConfirmModal title="Delete Alert" message="Remove this alert from history?"
          onConfirm={() => { deleteAlert(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}

      {showModal && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-bullhorn" style={{ color:'var(--red)', marginRight:8 }}></i>Send Emergency Alert</h3>
              <button className="modal-x" onClick={() => setShowModal(false)} type="button"><i className="fa-solid fa-xmark"></i></button>
            </div>

            {sent ? (
              <div className="alert-sent-screen">
                <i className="fa-solid fa-circle-check alert-sent-icon"></i>
                <h3>Alert Broadcast!</h3>
                <p>Sent to <strong>{form.zone}</strong></p>
                {smsStatus === 'sent'   && <div className="sms-ok-pill"><i className="fa-solid fa-mobile-screen"></i> SMS delivered to {selectedResIds.length} resident(s)</div>}
                {smsStatus === 'failed' && <div className="sms-fail-pill"><i className="fa-solid fa-triangle-exclamation"></i> SMS delivery failed — check Semaphore API key</div>}
                {smsStatus === 'no-key' && <div className="sms-demo-pill"><i className="fa-solid fa-info-circle"></i> Add VITE_SEMAPHORE_KEY to .env to enable real SMS</div>}
              </div>
            ) : (
              <div>
                <div className="form-2">
                  <div className="form-grp">
                    <label>Alert Level</label>
                    <select className="form-ctrl" value={form.level} onChange={e => setForm({...form, level:e.target.value})}>
                      <option>Advisory</option><option>Warning</option><option>Danger</option><option>Resolved</option>
                    </select>
                  </div>
                  <div className="form-grp">
                    <label>Target Zone</label>
                    <select className="form-ctrl" value={form.zone} onChange={e => setForm({...form, zone:e.target.value})}>
                      {ALL_ZONES.map(z => <option key={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="form-grp full">
                    <label>Alert Message *</label>
                    <textarea className="form-ctrl" rows={4} placeholder="e.g. FLOOD WARNING: Water level critically high..." value={form.message} onChange={e => setForm({...form, message:e.target.value})}></textarea>
                  </div>
                  <div className="form-grp full">
                    <label>
                      <i className="fa-solid fa-mobile-screen" style={{ color:'var(--blue)', marginRight:5 }}></i>
                      SMS Recipients <span style={{ color:'var(--t3)', fontWeight:400, textTransform:'none' }}>(optional)</span>
                    </label>
                    <ResidentSmsDropdown
                      residents={residents}
                      selectedIds={selectedResIds}
                      onChange={setSelectedResIds}
                    />
                    <div className="sms-hint">
                      Select residents with registered contact numbers. Only residents with a contact number are shown. Leave empty to skip SMS.
                    </div>
                  </div>
                </div>
                {sendErr && <div className="form-err">{sendErr}</div>}
                <div className="modal-foot">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
                  <button className="btn btn-primary" onClick={handleSend} disabled={sending} type="button">
                    {sending
                      ? <><i className="fa-solid fa-spinner fa-spin"></i> Sending...</>
                      : <><i className="fa-solid fa-paper-plane"></i> Send Alert{selectedResIds.length > 0 ? ` + SMS (${selectedResIds.length})` : ''}</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}