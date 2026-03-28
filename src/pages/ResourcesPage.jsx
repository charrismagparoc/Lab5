import { useState } from 'react'
import { ConfirmModal } from '../components/Shared'
import { RESOURCE_CATEGORIES } from '../data/constants'
import { useApp } from '../context/AppContext'

const STA_CLS = { Available:'bd-success', Deployed:'bd-warning', 'In Use':'bd-danger', 'Partially Deployed':'bd-info' }

export default function ResourcesPage() {
  const { resources, addResource, updateResource, deleteResource } = useApp()
  const [filterCat, setFilterCat] = useState('All')
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [deleteId,  setDeleteId]  = useState(null)
  const [saving,    setSaving]    = useState(false)
  const [saveErr,   setSaveErr]   = useState('')
  const EMPTY = { name:'', category:'Equipment', quantity:1, available:1, unit:'pcs', status:'Available', location:'', notes:'' }
  const [form, setForm] = useState({ ...EMPTY })

  const filtered = resources.filter(r => {
    const matchCat = filterCat === 'All' || r.category === filterCat
    const matchQ   = (r.name||'').toLowerCase().includes(search.toLowerCase()) ||
                     (r.location||'').toLowerCase().includes(search.toLowerCase())
    return matchCat && matchQ
  })

  const openAdd  = () => { setEditing(null); setForm({ ...EMPTY }); setSaveErr(''); setShowModal(true) }
  const openEdit = r => { setEditing(r); setForm({ ...r }); setSaveErr(''); setShowModal(true) }

  const handleSave = async () => {
    if (!form.name?.trim()) { setSaveErr('Resource name is required.'); return }
    setSaveErr('')
    setSaving(true)
    try {
      const payload = {
        name:      form.name,
        category:  form.category,
        quantity:  parseInt(form.quantity) || 0,
        available: parseInt(form.available) || 0,
        unit:      form.unit || 'pcs',
        status:    form.status || 'Available',
        location:  form.location || '',
        notes:     form.notes || '',
      }
      if (editing) await updateResource(editing.id, payload)
      else await addResource(payload)
      setShowModal(false)
    } catch(e) { setSaveErr(e.message) }
    setSaving(false)
  }

  const cats = ['All', ...RESOURCE_CATEGORIES]

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

      {/* Search + Category dropdown */}
      <div style={{ display:'flex', gap:10, marginBottom:18, alignItems:'center' }}>
        <div style={{ position:'relative', flex:1, maxWidth:320 }}>
          <i className="fa-solid fa-magnifying-glass" style={{ position:'absolute', left:12, top:'50%',
            transform:'translateY(-50%)', color:'var(--t3)', fontSize:13, pointerEvents:'none' }}></i>
          <input
            className="form-ctrl"
            style={{ paddingLeft:36 }}
            placeholder="Search resources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ position:'relative' }}>
          <select
            className="form-ctrl"
            style={{ paddingRight:36, minWidth:180 }}
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
          >
            {cats.map(c => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Categories' : c}
              </option>
            ))}
          </select>
          <i className="fa-solid fa-chevron-down" style={{ position:'absolute', right:12, top:'50%',
            transform:'translateY(-50%)', color:'var(--t3)', fontSize:11, pointerEvents:'none' }}></i>
        </div>
        <span style={{ fontSize:12, color:'var(--t3)', flexShrink:0 }}>
          {filtered.length} {filtered.length===1?'item':'items'}
        </span>
      </div>

      {/* Table */}
      <div className="card" style={{ padding:0, overflow:'hidden' }}>
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Resource</th>
                <th>Category</th>
                <th>Total</th>
                <th>Available</th>
                <th>Availability</th>
                <th>Status</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const pct = r.quantity > 0 ? Math.round((r.available/r.quantity)*100) : 0
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13 }}>{r.name}</div>
                      {r.notes && <div style={{ fontSize:11, color:'var(--t3)', marginTop:2 }}>{r.notes}</div>}
                    </td>
                    <td>
                      <span className="badge bd-info" style={{ fontSize:10 }}>{r.category}</span>
                    </td>
                    <td style={{ fontWeight:600 }}>{r.quantity} <span style={{ color:'var(--t3)', fontWeight:400, fontSize:11 }}>{r.unit}</span></td>
                    <td style={{ fontWeight:600 }}>{r.available} <span style={{ color:'var(--t3)', fontWeight:400, fontSize:11 }}>{r.unit}</span></td>
                    <td style={{ minWidth:130 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ flex:1, height:6, background:'var(--bg-el)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ width:pct+'%', height:'100%', borderRadius:3,
                            background:pct>70?'var(--green)':pct>30?'var(--orange)':'var(--red)',
                            transition:'width .4s' }}></div>
                        </div>
                        <span style={{ fontSize:11, color:'var(--t2)', width:32, flexShrink:0 }}>{pct}%</span>
                      </div>
                    </td>
                    <td><span className={'badge '+(STA_CLS[r.status]||'bd-neutral')}>{r.status}</span></td>
                    <td style={{ fontSize:12.5, color:'var(--t2)' }}>{r.location||'—'}</td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="icon-btn" title="Edit" onClick={() => openEdit(r)} type="button">
                          <i className="fa-solid fa-pen-to-square" style={{ color:'var(--blue)' }}></i>
                        </button>
                        <button className="icon-btn" title="Delete" onClick={() => setDeleteId(r.id)} type="button">
                          <i className="fa-solid fa-trash" style={{ color:'var(--red)' }}></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8}>
                  <div className="empty" style={{ padding:28 }}>
                    <i className="fa-solid fa-box-open"></i>
                    <p>No resources found{search ? ` matching "${search}"` : ''}.</p>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span>{editing ? 'Edit Resource' : 'Add Resource'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)} type="button">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div style={{ padding:'18px 22px', display:'flex', flexDirection:'column', gap:14 }}>
              {saveErr && <div className="form-err">{saveErr}</div>}
              <div className="form-2">
                <div className="form-grp">
                  <label className="form-label">Resource Name *</label>
                  <input className="form-ctrl" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Rescue Boats" />
                </div>
                <div className="form-grp">
                  <label className="form-label">Category</label>
                  <select className="form-ctrl" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
                    {RESOURCE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-grp">
                  <label className="form-label">Total Quantity</label>
                  <input className="form-ctrl" type="number" min="0" value={form.quantity} onChange={e=>setForm(p=>({...p,quantity:e.target.value}))} />
                </div>
                <div className="form-grp">
                  <label className="form-label">Available</label>
                  <input className="form-ctrl" type="number" min="0" value={form.available} onChange={e=>setForm(p=>({...p,available:e.target.value}))} />
                </div>
                <div className="form-grp">
                  <label className="form-label">Unit</label>
                  <input className="form-ctrl" value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} placeholder="pcs, kg, liters..." />
                </div>
                <div className="form-grp">
                  <label className="form-label">Status</label>
                  <select className="form-ctrl" value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))}>
                    {['Available','Deployed','In Use','Partially Deployed'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-grp full">
                  <label className="form-label">Location / Storage</label>
                  <input className="form-ctrl" value={form.location} onChange={e=>setForm(p=>({...p,location:e.target.value}))} placeholder="Storage location" />
                </div>
                <div className="form-grp full">
                  <label className="form-label">Notes</label>
                  <input className="form-ctrl" value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes" />
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} type="button">Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving} type="button">
                {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Saving...</> : 'Save Resource'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          message="Delete this resource? This action cannot be undone."
          onConfirm={async () => { await deleteResource(deleteId); setDeleteId(null) }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  )
}
