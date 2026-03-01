import { useState } from 'react'
import { ConfirmModal } from '../components/Shared'
import { RESOURCE_CATEGORIES } from '../data/constants'
import { useApp } from '../context/AppContext'

const STA_CLS = { Available:'bd-success', Deployed:'bd-warning', 'In Use':'bd-danger', 'Partially Deployed':'bd-info' }

export default function ResourcesPage() {
  const { resources, addResource, updateResource, deleteResource } = useApp()
  const [filterCat, setFilterCat] = useState('All')
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [deleteId,  setDeleteId]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveErr,   setSaveErr]   = useState('')
  const EMPTY = { name:'', category:'Equipment', quantity:1, available:1, unit:'pcs', status:'Available', location:'', notes:'' }
  const [form, setForm] = useState({ ...EMPTY })

  const filtered = filterCat === 'All' ? resources : resources.filter(r => r.category === filterCat)

  const openAdd  = () => { setEditing(null); setForm({ ...EMPTY }); setSaveErr(''); setShowModal(true) }
  const openEdit = r => { setEditing(r); setForm({ ...r }); setSaveErr(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name.trim()) { setSaveErr('Resource name is required.'); return }
    setSaveErr('')
    setSaving(true)
    try {
      if (editing) await updateResource(editing.id, form)
      else await addResource(form)
      setShowModal(false)
    } catch(e) { setSaveErr(e.message) }
    setSaving(false)
  }

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Resource Management</div>
          <div className="page-sub">Track equipment, supplies and deployment status</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} type="button">
          <i className="fa-solid fa-plus"></i> Add Resource
        </button>
      </div>

      <div className="filter-row">
        <button className={'btn btn-sm ' + (filterCat==='All'?'btn-primary':'btn-secondary')} onClick={() => setFilterCat('All')} type="button">All</button>
        {RESOURCE_CATEGORIES.map(c => (
          <button key={c} className={'btn btn-sm ' + (filterCat===c?'btn-primary':'btn-secondary')} onClick={() => setFilterCat(c)} type="button">{c}</button>
        ))}
      </div>

      <div className="card" style={{ padding:0 }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr><th>Resource</th><th>Category</th><th>Total</th><th>Available</th><th>Availability</th><th>Status</th><th>Location</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const pct = r.quantity > 0 ? (r.available / r.quantity) * 100 : 0
                const fillColor = pct > 50 ? 'var(--green)' : pct > 20 ? 'var(--orange)' : 'var(--red)'
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight:600 }}>{r.name}</div>
                      <div style={{ fontSize:10, color:'var(--t3)', fontFamily:'monospace' }}>{(r.id||'').slice(0,8)}</div>
                    </td>
                    <td style={{ fontSize:12.5, color:'var(--t2)' }}>{r.category}</td>
                    <td style={{ textAlign:'center', fontWeight:700 }}>{r.quantity}</td>
                    <td style={{ textAlign:'center' }}>{r.available} {r.unit}</td>
                    <td style={{ width:130 }}>
                      <div className="res-bar-wrap">
                        <div className="res-track"><div className="res-fill" style={{ width:pct+'%', background:fillColor }}></div></div>
                        <span style={{ fontSize:11, color:'var(--t3)', flexShrink:0 }}>{Math.round(pct)}%</span>
                      </div>
                    </td>
                    <td><span className={'badge ' + (STA_CLS[r.status]||'bd-neutral')}>{r.status}</span></td>
                    <td style={{ fontSize:12, color:'var(--t2)' }}>{r.location||'—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)} type="button"><i className="fa-solid fa-pen"></i></button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteId(r.id)} type="button"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}><div className="empty"><i className="fa-solid fa-boxes-stacked"></i><p>No resources yet. Add one above.</p></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteId && (
        <ConfirmModal title="Delete Resource" message="Remove this resource from the database?"
          onConfirm={async () => { await deleteResource(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)} />
      )}

      {showModal && (
        <div className="modal-ov" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <h3><i className="fa-solid fa-boxes-stacked" style={{ color:'var(--blue)', marginRight:8 }}></i>{editing ? 'Edit Resource' : 'Add Resource'}</h3>
              <button className="modal-x" onClick={() => setShowModal(false)} type="button"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="form-2">
              <div className="form-grp full"><label>Resource Name *</label><input className="form-ctrl" placeholder="e.g. Life Jackets" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
              <div className="form-grp"><label>Category</label><select className="form-ctrl" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{RESOURCE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="form-grp"><label>Status</label><select className="form-ctrl" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Available</option><option>Partially Deployed</option><option>Deployed</option><option>In Use</option></select></div>
              <div className="form-grp"><label>Total Quantity</label><input className="form-ctrl" type="number" min={0} value={form.quantity} onChange={e=>setForm({...form,quantity:parseInt(e.target.value)||0})}/></div>
              <div className="form-grp"><label>Available</label><input className="form-ctrl" type="number" min={0} value={form.available} onChange={e=>setForm({...form,available:parseInt(e.target.value)||0})}/></div>
              <div className="form-grp"><label>Unit</label><input className="form-ctrl" placeholder="pcs, kits, packs..." value={form.unit||'pcs'} onChange={e=>setForm({...form,unit:e.target.value})}/></div>
              <div className="form-grp full"><label>Storage Location</label><input className="form-ctrl" placeholder="e.g. Barangay Hall Storage Room" value={form.location||''} onChange={e=>setForm({...form,location:e.target.value})}/></div>
              <div className="form-grp full"><label>Notes</label><textarea className="form-ctrl" rows={2} value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}></textarea></div>
            </div>
            {saveErr && <div style={{ color:'var(--red)', fontSize:12.5, margin:'8px 0', background:'rgba(232,72,85,.08)', padding:'8px 12px', borderRadius:7 }}>{saveErr}</div>}
            <div style={{ marginTop:14, display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : <><i className="fa-solid fa-floppy-disk"></i> {editing?'Save Changes':'Add Resource'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
