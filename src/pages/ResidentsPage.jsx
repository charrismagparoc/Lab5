// ResidentsPage.jsx — Read-only from web, data populated via mobile app
import { useState } from 'react'
import { ConfirmModal } from '../components/Shared'
import { ZONES, VULNERABILITY_TAGS } from '../data/constants'
import { useApp } from '../context/AppContext'

const STA_CLS = { Safe:'bd-success', Evacuated:'bd-info', Unaccounted:'bd-danger' }

export default function ResidentsPage() {
  const { residents, updateResident, deleteResident } = useApp()
  const [search,       setSearch]       = useState('')
  const [filterZone,   setFilterZone]   = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [showModal,    setShowModal]    = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [saveErr,      setSaveErr]      = useState('')
  const [form,         setForm]         = useState({})

  const filtered = residents.filter(r => {
    const mz = filterZone === 'All' || r.zone === filterZone
    const ms = filterStatus === 'All' || r.evacuationStatus === filterStatus
    const mq = (r.name||'').toLowerCase().includes(search.toLowerCase()) ||
               (r.address||'').toLowerCase().includes(search.toLowerCase())
    return mz && ms && mq
  })

  const openEdit = r => {
    setEditing(r)
    setForm({ ...r, vulnerabilityTags: r.vulnerabilityTags || [] })
    setSaveErr('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name?.trim()) { setSaveErr('Full name is required.'); return }
    setSaveErr('')
    setSaving(true)
    try {
      // Only send updatable fields — never created_at or id
      const payload = {
        name:              form.name,
        zone:              form.zone,
        address:           form.address || '',
        household_members: parseInt(form.householdMembers) || 1,
        contact:           form.contact || '',
        evacuation_status: form.evacuationStatus || 'Safe',
        vulnerability_tags: form.vulnerabilityTags || [],
        notes:             form.notes || '',
      }
      await updateResident(editing.id, payload)
      setShowModal(false)
    } catch(e) { setSaveErr(e.message) }
    setSaving(false)
  }

  const toggleTag = t => setForm(p => ({
    ...p,
    vulnerabilityTags: (p.vulnerabilityTags||[]).includes(t)
      ? p.vulnerabilityTags.filter(x => x !== t)
      : [...(p.vulnerabilityTags||[]), t],
  }))

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Resident Management</div>
          <div className="page-sub">Database with vulnerability tagging and evacuation tracking</div>
        </div>
        <div className="mobile-only-note">
          <i className="fa-solid fa-mobile-screen" style={{ color:'var(--blue)', marginRight:6 }}></i>
          <span style={{ fontSize:12, color:'var(--t2)' }}>Residents are added via the mobile app</span>
        </div>
      </div>

      <div className="sum-pills">
        {[['Safe','bd-success'],['Evacuated','bd-info'],['Unaccounted','bd-danger']].map(([s,c]) => (
          <span key={s} className={'badge ' + c} style={{ cursor:'pointer' }}
            onClick={() => setFilterStatus(filterStatus === s ? 'All' : s)}>
            {residents.filter(r=>r.evacuationStatus===s).length} {s}
          </span>
        ))}
        <span className="badge bd-purple">
          {residents.filter(r=>(r.vulnerabilityTags||[]).length>0).length} Vulnerable
        </span>
      </div>

      <div className="filter-row">
        <input className="form-ctrl" placeholder="Search name or address..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth:240 }} />
        <select className="form-ctrl" value={filterZone} onChange={e => setFilterZone(e.target.value)} style={{ maxWidth:140 }}>
          <option>All</option>{ZONES.map(z=><option key={z}>{z}</option>)}
        </select>
        <select className="form-ctrl" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ maxWidth:160 }}>
          <option>All</option><option>Safe</option><option>Evacuated</option><option>Unaccounted</option>
        </select>
        <span style={{ marginLeft:'auto', fontSize:12, color:'var(--t3)' }}>{filtered.length} resident{filtered.length!==1?'s':''}</span>
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Zone / Address</th><th>HH</th><th>Contact</th><th>Vulnerability</th><th>Status</th><th>Source</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ fontWeight:600 }}>{r.name}</div>
                    <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'monospace' }}>{(r.id||'').slice(0,8)}</div>
                  </td>
                  <td>
                    <div>{r.zone}</div>
                    <div style={{ fontSize:11, color:'var(--t3)' }}>{r.address}</div>
                  </td>
                  <td style={{ textAlign:'center' }}>{r.householdMembers}</td>
                  <td style={{ fontSize:12, color:'var(--t2)' }}>{r.contact||'—'}</td>
                  <td>
                    {(r.vulnerabilityTags||[]).length === 0
                      ? <span style={{ color:'var(--t3)', fontSize:12 }}>—</span>
                      : (r.vulnerabilityTags||[]).map(t => <span key={t} className="vuln-tag"><i className="fa-solid fa-heart-pulse"></i>{t}</span>)}
                  </td>
                  <td><span className={'badge ' + STA_CLS[r.evacuationStatus]}>{r.evacuationStatus}</span></td>
                  <td>
                    {r.source === 'mobile'
                      ? <span className="badge bd-info"><i className="fa-solid fa-mobile-screen"></i> Mobile</span>
                      : <span style={{ fontSize:11, color:'var(--t3)' }}>Web</span>}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)} type="button" title="Edit"><i className="fa-solid fa-pen"></i></button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)} type="button" title="Delete"><i className="fa-solid fa-trash"></i></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <div className="empty">
                    <i className="fa-solid fa-mobile-screen" style={{ fontSize:32, color:'var(--blue)', opacity:.5 }}></i>
                    <p>No residents found. Add residents using the mobile app.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteId && (
        <ConfirmModal title="Delete Resident" message="Remove this resident from the database permanently?"
          onConfirm={async () => { await deleteResident(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}

      {showModal && editing && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-user" style={{ color:'var(--blue)', marginRight:8 }}></i>Edit Resident</h3>
              <button className="modal-x" onClick={() => setShowModal(false)} type="button"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="form-2">
              <div className="form-grp full">
                <label htmlFor="res-name">Full Name *</label>
                <input id="res-name" className="form-ctrl" placeholder="Full name..." value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/>
              </div>
              <div className="form-grp">
                <label htmlFor="res-zone">Zone</label>
                <select id="res-zone" className="form-ctrl" value={form.zone||'Zone 1'} onChange={e=>setForm({...form,zone:e.target.value})}>
                  {ZONES.map(z=><option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="form-grp">
                <label htmlFor="res-status">Evacuation Status</label>
                <select id="res-status" className="form-ctrl" value={form.evacuationStatus||'Safe'} onChange={e=>setForm({...form,evacuationStatus:e.target.value})}>
                  <option>Safe</option><option>Evacuated</option><option>Unaccounted</option>
                </select>
              </div>
              <div className="form-grp full">
                <label htmlFor="res-addr">Address</label>
                <input id="res-addr" className="form-ctrl" placeholder="Purok / Street..." value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/>
              </div>
              <div className="form-grp">
                <label htmlFor="res-hh">Household Members</label>
                <input id="res-hh" className="form-ctrl" type="number" min={1} value={form.householdMembers||1} onChange={e=>setForm({...form,householdMembers:parseInt(e.target.value)||1})}/>
              </div>
              <div className="form-grp">
                <label htmlFor="res-contact">Contact Number</label>
                <input id="res-contact" className="form-ctrl" placeholder="09XX-XXX-XXXX" value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})}/>
              </div>
              <div className="form-grp full">
                <label>Vulnerability Tags</label>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:5 }}>
                  {VULNERABILITY_TAGS.map(t => (
                    <button key={t} type="button"
                      className={'btn btn-sm ' + ((form.vulnerabilityTags||[]).includes(t)?'btn-primary':'btn-secondary')}
                      onClick={() => toggleTag(t)}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="form-grp full">
                <label htmlFor="res-notes">Notes</label>
                <textarea id="res-notes" className="form-ctrl" rows={2} placeholder="Additional notes..." value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}></textarea>
              </div>
            </div>
            {saveErr && <div className="form-err">{saveErr}</div>}
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
