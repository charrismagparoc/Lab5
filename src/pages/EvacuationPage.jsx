import { useState } from 'react'
import { ConfirmModal } from '../components/Shared'
import { ZONES, EVAC_FACILITIES } from '../data/constants'
import { useApp } from '../context/AppContext'

const STA_CLS = { Open:'bd-success', Full:'bd-warning', Closed:'bd-neutral' }

export default function EvacuationPage() {
  const { evacCenters, addEvacCenter, updateEvacCenter, deleteEvacCenter } = useApp()
  const [selected,   setSelected]  = useState(null)
  const [showModal,  setShowModal] = useState(false)
  const [isEdit,     setIsEdit]    = useState(false)
  const [deleteId,   setDeleteId]  = useState(null)
  const [saving,     setSaving]    = useState(false)
  const [saveErr,    setSaveErr]   = useState('')
  const [search,     setSearch]    = useState('')
  const [filterZone, setFilterZone]= useState('All')
  const [filterSta,  setFilterSta] = useState('All')

  const EMPTY = { name:'', address:'', zone:'Zone 1', status:'Open', capacity:100, occupancy:0, contactPerson:'', contact:'', facilitiesAvailable:[] }
  const [form, setForm] = useState({ ...EMPTY })

  const filtered = evacCenters.filter(c => {
    const mq = (c.name||'').toLowerCase().includes(search.toLowerCase()) ||
               (c.address||'').toLowerCase().includes(search.toLowerCase())
    const mz = filterZone === 'All' || c.zone   === filterZone
    const ms = filterSta  === 'All' || c.status === filterSta
    return mq && mz && ms
  })

  const openAdd  = () => { setIsEdit(false); setForm({ ...EMPTY }); setSaveErr(''); setShowModal(true) }
  const openEdit = c  => { setIsEdit(true);  setForm({ ...c, facilitiesAvailable: c.facilitiesAvailable||[] }); setSaveErr(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveErr('Center name is required.'); return }
    setSaveErr(''); setSaving(true)
    try {
      if (isEdit && form.id) await updateEvacCenter(form.id, form)
      else await addEvacCenter(form)
      setShowModal(false)
    } catch(e) { setSaveErr(e.message) }
    setSaving(false)
  }

  const toggleFac = f => setForm(p => ({
    ...p,
    facilitiesAvailable: (p.facilitiesAvailable||[]).includes(f)
      ? p.facilitiesAvailable.filter(x => x !== f)
      : [...(p.facilitiesAvailable||[]), f],
  }))

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Evacuation Centers</div>
          <div className="page-sub">Monitor capacity, occupancy and status in real-time</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} type="button">
          <i className="fa-solid fa-plus"></i> Add Center
        </button>
      </div>

      {/* Search + filter bar */}
      <div style={{ display:'flex', gap:10, marginBottom:16, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:300 }}>
          <i className="fa-solid fa-magnifying-glass" style={{
            position:'absolute', left:11, top:'50%', transform:'translateY(-50%)',
            color:'var(--t3)', fontSize:13, pointerEvents:'none'
          }}></i>
          <input className="form-ctrl" style={{ paddingLeft:34 }}
            placeholder="Search centers..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ position:'relative' }}>
          <select className="form-ctrl" style={{ minWidth:130, paddingRight:30 }}
            value={filterZone} onChange={e => setFilterZone(e.target.value)}>
            <option value="All">All Zones</option>
            {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
          </select>
          <i className="fa-solid fa-chevron-down" style={{
            position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
            color:'var(--t3)', fontSize:11, pointerEvents:'none'
          }}></i>
        </div>

        <div style={{ position:'relative' }}>
          <select className="form-ctrl" style={{ minWidth:140, paddingRight:30 }}
            value={filterSta} onChange={e => setFilterSta(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Full">Full</option>
            <option value="Closed">Closed</option>
          </select>
          <i className="fa-solid fa-chevron-down" style={{
            position:'absolute', right:10, top:'50%', transform:'translateY(-50%)',
            color:'var(--t3)', fontSize:11, pointerEvents:'none'
          }}></i>
        </div>

        <span style={{ fontSize:12, color:'var(--t3)', flexShrink:0 }}>
          {filtered.length} {filtered.length === 1 ? 'center' : 'centers'}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Center Name</th>
                <th>Zone</th>
                <th>Status</th>
                <th>Occupancy / Capacity</th>
                <th>Utilization</th>
                <th>Contact Person</th>
                <th>Facilities</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const pct = c.capacity > 0 ? Math.round((c.occupancy / c.capacity) * 100) : 0
                const barColor = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--orange)' : 'var(--green)'
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight:700, fontSize:13 }}>{c.name}</div>
                      {c.address && <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{c.address}</div>}
                    </td>
                    <td style={{ color:'var(--t2)', fontSize:13 }}>{c.zone}</td>
                    <td><span className={'badge ' + (STA_CLS[c.status]||'bd-neutral')}>{c.status}</span></td>
                    <td>
                      <strong style={{ color: pct > 80 ? 'var(--red)' : 'var(--t1)' }}>{c.occupancy}</strong>
                      <span style={{ color:'var(--t3)' }}> / {c.capacity}</span>
                    </td>
                    <td style={{ minWidth:130 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, height:6, background:'var(--bg-el)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width: pct + '%', height:'100%', background: barColor,
                            borderRadius:3, transition:'width .4s' }}></div>
                        </div>
                        <span style={{ fontSize:11, color:'var(--t2)', width:32, flexShrink:0 }}>{pct}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize:12, color:'var(--t2)' }}>
                      <div>{c.contactPerson || '—'}</div>
                      {c.contact && <div style={{ fontSize:11, color:'var(--t3)' }}>{c.contact}</div>}
                    </td>
                    <td>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                        {(c.facilitiesAvailable||[]).map(f => (
                          <span key={f} className="badge bd-info" style={{ fontSize:9.5 }}>{f}</span>
                        ))}
                        {!(c.facilitiesAvailable||[]).length &&
                          <span style={{ color:'var(--t3)', fontSize:11 }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:5 }}>
                        <button className="icon-btn" title="View" onClick={() => setSelected(c)} type="button">
                          <i className="fa-solid fa-eye" style={{ color:'var(--blue)' }}></i>
                        </button>
                        <button className="icon-btn" title="Edit" onClick={() => openEdit(c)} type="button">
                          <i className="fa-solid fa-pen-to-square" style={{ color:'var(--blue)' }}></i>
                        </button>
                        <button className="icon-btn" title="Delete" onClick={() => setDeleteId(c.id)} type="button">
                          <i className="fa-solid fa-trash" style={{ color:'var(--red)' }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <div className="empty" style={{ padding:32 }}>
                    <i className="fa-solid fa-house-flag" style={{ fontSize:26, color:'var(--t3)' }}></i>
                    <p style={{ marginTop:10, color:'var(--t2)' }}>
                      {evacCenters.length === 0
                        ? 'No evacuation centers yet. Click Add Center to get started.'
                        : 'No centers match your search or filters.'}
                    </p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {selected && !showModal && (
        <div className="modal-ov" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>
                <i className="fa-solid fa-house-flag" style={{ color:'var(--green)', marginRight:8 }}></i>
                {selected.name}
              </h3>
              <button className="modal-x" onClick={() => setSelected(null)} type="button">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="det-grid">
              <div className="det-item"><span>Zone</span><strong>{selected.zone}</strong></div>
              <div className="det-item"><span>Status</span><span className={'badge '+STA_CLS[selected.status]}>{selected.status}</span></div>
              <div className="det-item"><span>Capacity</span><strong>{selected.capacity}</strong></div>
              <div className="det-item"><span>Occupancy</span><strong>{selected.occupancy}</strong></div>
              <div className="det-item"><span>Contact Person</span><strong>{selected.contactPerson||'—'}</strong></div>
              <div className="det-item"><span>Contact Number</span><strong>{selected.contact||'—'}</strong></div>
              <div className="det-item full"><span>Address</span><strong>{selected.address||'—'}</strong></div>
              <div className="det-item full">
                <span>Facilities</span>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:4 }}>
                  {(selected.facilitiesAvailable||[]).map(f =>
                    <span key={f} className="badge bd-info">{f}</span>
                  )}
                  {!(selected.facilitiesAvailable||[]).length &&
                    <span style={{ color:'var(--t3)' }}>None listed</span>}
                </div>
              </div>
            </div>
            <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
              <div style={{ fontSize:11.5, fontWeight:700, color:'var(--t3)',
                textTransform:'uppercase', letterSpacing:'.5px', marginBottom:8 }}>
                Quick Status Update
              </div>
              <div style={{ display:'flex', gap:7 }}>
                {['Open','Full','Closed'].map(s => (
                  <button key={s} type="button"
                    className={'btn btn-sm ' + (selected.status===s ? 'btn-primary' : 'btn-secondary')}
                    onClick={async () => {
                      await updateEvacCenter(selected.id, { status:s })
                      setSelected(p => ({ ...p, status:s }))
                    }}>{s}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop:12 }}>
              <button className="btn btn-outline btn-sm" type="button"
                onClick={() => { openEdit(selected); setSelected(null) }}>
                <i className="fa-solid fa-pen"></i> Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3>
                <i className="fa-solid fa-house-flag" style={{ color:'var(--green)', marginRight:8 }}></i>
                {isEdit ? 'Edit Center' : 'Add Evacuation Center'}
              </h3>
              <button className="modal-x" onClick={() => setShowModal(false)} type="button">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="form-2">
              <div className="form-grp full">
                <label className="form-label">Center Name *</label>
                <input className="form-ctrl" placeholder="e.g. Kauswagan Covered Court"
                  value={form.name} onChange={e => setForm({...form, name:e.target.value})} />
              </div>
              <div className="form-grp full">
                <label className="form-label">Address</label>
                <input className="form-ctrl" placeholder="Full address..."
                  value={form.address||''} onChange={e => setForm({...form, address:e.target.value})} />
              </div>
              <div className="form-grp">
                <label className="form-label">Zone</label>
                <select className="form-ctrl" value={form.zone}
                  onChange={e => setForm({...form, zone:e.target.value})}>
                  {ZONES.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="form-grp">
                <label className="form-label">Status</label>
                <select className="form-ctrl" value={form.status}
                  onChange={e => setForm({...form, status:e.target.value})}>
                  <option>Open</option><option>Full</option><option>Closed</option>
                </select>
              </div>
              <div className="form-grp">
                <label className="form-label">Capacity</label>
                <input className="form-ctrl" type="number" min={0}
                  value={form.capacity} onChange={e => setForm({...form, capacity:parseInt(e.target.value)||0})} />
              </div>
              <div className="form-grp">
                <label className="form-label">Current Occupancy</label>
                <input className="form-ctrl" type="number" min={0}
                  value={form.occupancy} onChange={e => setForm({...form, occupancy:parseInt(e.target.value)||0})} />
              </div>
              <div className="form-grp">
                <label className="form-label">Contact Person</label>
                <input className="form-ctrl" value={form.contactPerson||''}
                  onChange={e => setForm({...form, contactPerson:e.target.value})} />
              </div>
              <div className="form-grp">
                <label className="form-label">Contact Number</label>
                <input className="form-ctrl" placeholder="09XX-XXX-XXXX"
                  value={form.contact||''} onChange={e => setForm({...form, contact:e.target.value})} />
              </div>
              <div className="form-grp full">
                <label className="form-label">Facilities Available</label>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:5 }}>
                  {EVAC_FACILITIES.map(f => (
                    <button key={f} type="button"
                      className={'btn btn-sm ' + ((form.facilitiesAvailable||[]).includes(f) ? 'btn-success' : 'btn-secondary')}
                      onClick={() => toggleFac(f)}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
            {saveErr && (
              <div style={{ color:'var(--red)', fontSize:12.5, margin:'10px 0',
                background:'rgba(232,72,85,.08)', padding:'8px 12px', borderRadius:7 }}>
                {saveErr}
              </div>
            )}
            <div style={{ marginTop:16, display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving
                  ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</>
                  : <><i className="fa-solid fa-floppy-disk"></i> {isEdit ? 'Save Changes' : 'Add Center'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          title="Delete Center"
          message="Remove this evacuation center permanently?"
          onConfirm={async () => { await deleteEvacCenter(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
