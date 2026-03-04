import { useState } from 'react'
import { ConfirmModal } from '../components/Shared'
import { ZONES, DISASTER_TYPES } from '../data/constants'
import { useApp } from '../context/AppContext'

const SEV_CLS = { High:'bd-danger', Medium:'bd-warning', Low:'bd-info' }
const STA_CLS = { Active:'bd-danger', Pending:'bd-warning', Verified:'bd-info', Responded:'bd-purple', Resolved:'bd-success' }
const STATUSES = ['All','Active','Pending','Verified','Responded','Resolved']
const EMPTY = { type:'Flood', zone:'Zone 1', location:'', severity:'Medium', reporter:'', description:'' }

export default function IncidentsPage() {
  const { incidents, addIncident, updateIncident, deleteIncident } = useApp()
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterType,   setFilterType]   = useState('All')
  const [search,       setSearch]       = useState('')
  const [showModal,    setShowModal]    = useState(false)
  const [selected,     setSelected]     = useState(null)
  const [isEditing,    setIsEditing]    = useState(false)
  const [form,         setForm]         = useState({ ...EMPTY })
  const [deleteId,     setDeleteId]     = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [saveErr,      setSaveErr]      = useState('')

  const filtered = incidents.filter(i => {
    const ms = filterStatus === 'All' || i.status === filterStatus
    const mt = filterType === 'All'   || i.type   === filterType
    const mq = (i.location||'').toLowerCase().includes(search.toLowerCase()) ||
               (i.zone||'').toLowerCase().includes(search.toLowerCase()) ||
               (i.reporter||'').toLowerCase().includes(search.toLowerCase())
    return ms && mt && mq
  })

  const openNew  = () => { setIsEditing(false); setSelected(null); setForm({ ...EMPTY }); setSaveErr(''); setShowModal(true) }
  const openView = inc  => { setIsEditing(false); setSelected(inc); setForm({ ...inc }); setSaveErr(''); setShowModal(true) }
  const openEdit = inc  => { setIsEditing(true); setSelected(inc); setForm({ ...inc }); setSaveErr(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.location?.trim()) { setSaveErr('Location is required.'); return }
    if (!form.reporter?.trim()) { setSaveErr('Reporter name is required.'); return }
    setSaveErr('')
    setSaving(true)
    try {
      // Only send fields that belong to the incidents table
      const payload = {
        type:        form.type,
        zone:        form.zone,
        location:    form.location,
        severity:    form.severity,
        reporter:    form.reporter,
        description: form.description || '',
      }
      if (isEditing && selected) await updateIncident(selected.id, payload)
      else await addIncident(payload)
      setShowModal(false)
    } catch (e) { setSaveErr(e.message) }
    setSaving(false)
  }

  const updateStatus = async (id, s) => {
    await updateIncident(id, { status: s })
    setSelected(p => p ? { ...p, status: s } : p)
  }

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Incident Management</div>
          <div className="page-sub">Track, verify and respond to reported incidents in real-time</div>
        </div>
        <button className="btn btn-primary" onClick={openNew} type="button">
          <i className="fa-solid fa-plus"></i> Report Incident
        </button>
      </div>

      <div className="sum-pills">
        {STATUSES.slice(1).map(s => (
          <span key={s} className={'badge ' + STA_CLS[s]} style={{ cursor:'pointer' }} onClick={() => setFilterStatus(filterStatus === s ? 'All' : s)}>
            {incidents.filter(i => i.status === s).length} {s}
          </span>
        ))}
      </div>

      <div className="filter-row">
        <input className="form-ctrl" placeholder="Search location, zone, reporter..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 280 }} />
        <select className="form-ctrl" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth: 160 }}>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-ctrl" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ maxWidth: 150 }}>
          <option>All</option>{DISASTER_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t3)' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Type</th><th>Zone / Location</th><th>Reporter</th>
                <th>Severity</th><th>Status</th><th>Source</th><th>Reported</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inc => (
                <tr key={inc.id}>
                  <td><span style={{ fontFamily:'monospace', fontSize:11 }}>{(inc.id||'').slice(0,8)}</span></td>
                  <td style={{ fontWeight: 600 }}>{inc.type}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{inc.zone}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>{inc.location}</div>
                  </td>
                  <td style={{ fontSize: 12.5 }}>{inc.reporter || '—'}</td>
                  <td><span className={'badge ' + SEV_CLS[inc.severity]}>{inc.severity}</span></td>
                  <td><span className={'badge ' + STA_CLS[inc.status]}>{inc.status}</span></td>
                  <td>
                    {inc.source === 'mobile'
                      ? <span className="badge bd-info"><i className="fa-solid fa-mobile"></i> Mobile</span>
                      : <span style={{ fontSize:11,color:'var(--t3)' }}>Web</span>}
                  </td>
                  <td style={{ fontSize: 11.5, color: 'var(--t3)', whiteSpace:'nowrap' }}>
                    {inc.dateReported ? new Date(inc.dateReported).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => openView(inc)} type="button" title="View"><i className="fa-solid fa-eye"></i></button>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(inc)} type="button" title="Edit"><i className="fa-solid fa-pen"></i></button>
                      {inc.status !== 'Resolved' && (
                        <button className="btn btn-success btn-sm" onClick={() => updateStatus(inc.id, 'Resolved')} type="button" title="Resolve"><i className="fa-solid fa-check"></i></button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(inc.id)} type="button" title="Delete"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9}><div className="empty"><i className="fa-solid fa-inbox"></i><p>No incidents match your filters.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteId && (
        <ConfirmModal title="Delete Incident" message="This will permanently remove this incident record."
          onConfirm={async () => { await deleteIncident(deleteId); setDeleteId(null); setShowModal(false) }}
          onCancel={() => setDeleteId(null)} />
      )}

      {showModal && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>
                <i className="fa-solid fa-triangle-exclamation" style={{ color:'var(--orange)', marginRight:8 }}></i>
                {isEditing ? 'Edit Incident' : selected ? `Incident ${(selected.id||'').slice(0,8)}` : 'Report New Incident'}
              </h3>
              <button className="modal-x" onClick={() => setShowModal(false)} type="button"><i className="fa-solid fa-xmark"></i></button>
            </div>

            {selected && !isEditing ? (
              <div>
                <div className="det-grid">
                  <div className="det-item"><span>Type</span><strong>{selected.type}</strong></div>
                  <div className="det-item"><span>Zone</span><strong>{selected.zone}</strong></div>
                  <div className="det-item"><span>Severity</span><span className={'badge ' + SEV_CLS[selected.severity]}>{selected.severity}</span></div>
                  <div className="det-item"><span>Status</span><span className={'badge ' + STA_CLS[selected.status]}>{selected.status}</span></div>
                  <div className="det-item full"><span>Location</span><strong>{selected.location||'—'}</strong></div>
                  <div className="det-item full"><span>Reporter</span><strong>{selected.reporter||'—'}</strong></div>
                  {selected.description && <div className="det-item full"><span>Description</span><p style={{ fontSize:13, lineHeight:1.6, color:'var(--t1)', marginTop:4 }}>{selected.description}</p></div>}
                </div>
                <div className="divider"></div>
                <div className="sec-title"><i className="fa-solid fa-arrow-right-arrow-left"></i> Update Status</div>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:16 }}>
                  {['Pending','Verified','Responded','Resolved'].map(s => (
                    <button key={s} type="button" className={'btn btn-sm ' + (selected.status===s?'btn-primary':'btn-secondary')} onClick={() => updateStatus(selected.id, s)}>{s}</button>
                  ))}
                </div>
                <div style={{ display:'flex', gap:7 }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(selected)} type="button"><i className="fa-solid fa-pen"></i> Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(selected.id)} type="button"><i className="fa-solid fa-trash"></i> Delete</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="form-2">
                  <div className="form-grp">
                    <label htmlFor="inc-type">Disaster Type</label>
                    <select id="inc-type" className="form-ctrl" value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                      {DISASTER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-grp">
                    <label htmlFor="inc-zone">Zone</label>
                    <select id="inc-zone" className="form-ctrl" value={form.zone} onChange={e => setForm({...form, zone:e.target.value})}>
                      {ZONES.map(z => <option key={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="form-grp full">
                    <label htmlFor="inc-loc">Specific Location *</label>
                    <input id="inc-loc" className="form-ctrl" placeholder="e.g. Near Cagayan River, Purok 2..." value={form.location} onChange={e => setForm({...form, location:e.target.value})} />
                  </div>
                  <div className="form-grp">
                    <label htmlFor="inc-sev">Severity</label>
                    <select id="inc-sev" className="form-ctrl" value={form.severity} onChange={e => setForm({...form, severity:e.target.value})}>
                      <option>Low</option><option>Medium</option><option>High</option>
                    </select>
                  </div>
                  <div className="form-grp">
                    <label htmlFor="inc-rep">Reported By *</label>
                    <input id="inc-rep" className="form-ctrl" placeholder="Full name..." value={form.reporter} onChange={e => setForm({...form, reporter:e.target.value})} />
                  </div>
                  <div className="form-grp full">
                    <label htmlFor="inc-desc">Description</label>
                    <textarea id="inc-desc" className="form-ctrl" rows={3} placeholder="Describe the situation..." value={form.description||''} onChange={e => setForm({...form, description:e.target.value})}></textarea>
                  </div>
                </div>
                {saveErr && <div className="form-err">{saveErr}</div>}
                <div className="modal-foot">
                  <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
                  <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                    {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-paper-plane"></i> {isEditing ? 'Save Changes' : 'Submit Report'}</>}
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
