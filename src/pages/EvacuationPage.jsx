import { useState } from 'react'
import { ConfirmModal } from '../components/Shared'
import { ZONES, EVAC_FACILITIES } from '../data/constants'
import { useApp } from '../context/AppContext'

const STA_CLS = { Open:'bd-success', Full:'bd-warning', Closed:'bd-neutral' }

export default function EvacuationPage() {
  const { evacCenters, addEvacCenter, updateEvacCenter, deleteEvacCenter } = useApp()
  const [selected,  setSelected]  = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [isEdit,    setIsEdit]    = useState(false)
  const [deleteId,  setDeleteId]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveErr,   setSaveErr]   = useState('')
  const EMPTY = { name:'', address:'', zone:'Zone 1', status:'Open', capacity:100, occupancy:0, contactPerson:'', contact:'', facilitiesAvailable:[] }
  const [form, setForm] = useState({ ...EMPTY })

  const totalCap = evacCenters.reduce((a,c) => a + (c.capacity||0), 0)
  const totalOcc = evacCenters.reduce((a,c) => a + (c.occupancy||0), 0)

  const openAdd  = () => { setIsEdit(false); setForm({ ...EMPTY }); setSaveErr(''); setShowModal(true) }
  const openEdit = c => { setIsEdit(true); setForm({ ...c, facilitiesAvailable: c.facilitiesAvailable||[] }); setSelected(null); setSaveErr(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveErr('Center name is required.'); return }
    setSaveErr('')
    setSaving(true)
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

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
        {[
          ['Open Centers',      evacCenters.filter(c=>c.status==='Open').length, 'var(--green)'],
          ['Current Evacuees',  totalOcc,                                        'var(--blue)'],
          ['Remaining Capacity',totalCap - totalOcc,                             'var(--orange)'],
        ].map(([l,v,c]) => (
          <div key={l} className="card" style={{ textAlign:'center' }}>
            <div style={{ fontSize:30, fontWeight:800, color:c, fontFamily:'var(--disp)' }}>{v}</div>
            <div style={{ fontSize:12, color:'var(--t2)', marginTop:4 }}>{l}</div>
          </div>
        ))}
      </div>

      {evacCenters.length === 0 ? (
        <div className="empty"><i className="fa-solid fa-house-flag"></i><p>No evacuation centers yet. Add one above.</p></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:14 }}>
          {evacCenters.map(c => {
            const pct = c.capacity > 0 ? Math.min((c.occupancy / c.capacity) * 100, 100) : 0
            const fillColor = c.status === 'Open' ? 'var(--green)' : c.status === 'Full' ? 'var(--orange)' : 'var(--red)'
            return (
              <div key={c.id} className="card" style={{ cursor:'pointer', position:'relative' }} onClick={() => setSelected(c)}>
                <div style={{ position:'absolute', top:12, right:12, display:'flex', gap:5 }} onClick={e => e.stopPropagation()}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)} type="button"><i className="fa-solid fa-pen"></i></button>
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(c.id)} type="button"><i className="fa-solid fa-trash"></i></button>
                </div>
                <div style={{ marginBottom:10, paddingRight:80 }}>
                  <div style={{ fontWeight:700, fontSize:15 }}>{c.name}</div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>{c.address || c.zone}</div>
                </div>
                <div style={{ display:'flex', gap:7, alignItems:'center', marginBottom:10 }}>
                  <span className={'badge ' + STA_CLS[c.status]}>{c.status}</span>
                  <span style={{ fontSize:12, color:'var(--t2)' }}>{c.zone}</span>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--t2)', marginBottom:4 }}>
                    <span>Occupancy</span><span>{c.occupancy}/{c.capacity}</span>
                  </div>
                  <div className="cap-track"><div className="cap-fill" style={{ width:pct+'%', background:fillColor }}></div></div>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {(c.facilitiesAvailable||[]).map(f => (
                    <span key={f} style={{ fontSize:10, color:'var(--t3)', background:'var(--bg-el)', padding:'2px 7px', borderRadius:20, border:'1px solid var(--border)' }}>{f}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {deleteId && (
        <ConfirmModal title="Delete Center" message="Remove this evacuation center permanently?"
          onConfirm={async () => { await deleteEvacCenter(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}

      {/* Detail modal */}
      {selected && !showModal && (
        <div className="modal-ov" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-house-flag" style={{ color:'var(--green)', marginRight:8 }}></i>{selected.name}</h3>
              <button className="modal-x" onClick={() => setSelected(null)} type="button"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="det-grid">
              <div className="det-item"><span>Zone</span><strong>{selected.zone}</strong></div>
              <div className="det-item"><span>Status</span><span className={'badge ' + STA_CLS[selected.status]}>{selected.status}</span></div>
              <div className="det-item"><span>Capacity</span><strong>{selected.capacity}</strong></div>
              <div className="det-item"><span>Occupancy</span><strong>{selected.occupancy}</strong></div>
              <div className="det-item"><span>Contact Person</span><strong>{selected.contactPerson||'—'}</strong></div>
              <div className="det-item"><span>Contact Number</span><strong>{selected.contact||'—'}</strong></div>
              <div className="det-item full"><span>Address</span><strong>{selected.address||'—'}</strong></div>
            </div>
            <div className="divider"></div>
            <div className="sec-title"><i className="fa-solid fa-arrow-right-arrow-left"></i> Quick Status Update</div>
            <div style={{ display:'flex', gap:7, marginBottom:14 }}>
              {['Open','Full','Closed'].map(s => (
                <button key={s} type="button" className={'btn btn-sm ' + (selected.status===s?'btn-primary':'btn-secondary')}
                  onClick={async () => { await updateEvacCenter(selected.id,{status:s}); setSelected(p=>({...p,status:s})) }}
                >{s}</button>
              ))}
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => openEdit(selected)} type="button">
              <i className="fa-solid fa-pen"></i> Edit Details
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-house-flag" style={{ color:'var(--green)', marginRight:8 }}></i>{isEdit ? 'Edit Center' : 'Add Evacuation Center'}</h3>
              <button className="modal-x" onClick={() => setShowModal(false)} type="button"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="form-2">
              <div className="form-grp full"><label>Center Name *</label><input className="form-ctrl" placeholder="e.g. Kauswagan Covered Court" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div className="form-grp full"><label>Address</label><input className="form-ctrl" placeholder="Full address..." value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/></div>
              <div className="form-grp"><label>Zone</label><select className="form-ctrl" value={form.zone} onChange={e=>setForm({...form,zone:e.target.value})}>{ZONES.map(z=><option key={z}>{z}</option>)}</select></div>
              <div className="form-grp"><label>Status</label><select className="form-ctrl" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Open</option><option>Full</option><option>Closed</option></select></div>
              <div className="form-grp"><label>Capacity</label><input className="form-ctrl" type="number" min={0} value={form.capacity} onChange={e=>setForm({...form,capacity:parseInt(e.target.value)||0})}/></div>
              <div className="form-grp"><label>Occupancy</label><input className="form-ctrl" type="number" min={0} value={form.occupancy} onChange={e=>setForm({...form,occupancy:parseInt(e.target.value)||0})}/></div>
              <div className="form-grp"><label>Contact Person</label><input className="form-ctrl" value={form.contactPerson||''} onChange={e=>setForm({...form,contactPerson:e.target.value})}/></div>
              <div className="form-grp"><label>Contact Number</label><input className="form-ctrl" placeholder="09XX-XXX-XXXX" value={form.contact||''} onChange={e=>setForm({...form,contact:e.target.value})}/></div>
              <div className="form-grp full">
                <label>Facilities Available</label>
                <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:5 }}>
                  {EVAC_FACILITIES.map(f => (
                    <button key={f} type="button"
                      className={'btn btn-sm ' + ((form.facilitiesAvailable||[]).includes(f)?'btn-success':'btn-secondary')}
                      onClick={() => toggleFac(f)}>{f}</button>
                  ))}
                </div>
              </div>
            </div>
            {saveErr && <div style={{ color:'var(--red)', fontSize:12.5, margin:'8px 0', background:'rgba(232,72,85,.08)', padding:'8px 12px', borderRadius:7 }}>{saveErr}</div>}
            <div style={{ marginTop:14, display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> {isEdit?'Save Changes':'Add Center'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
