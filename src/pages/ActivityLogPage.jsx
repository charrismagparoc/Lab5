// ─── ActivityLogPage.jsx ──────────────────────────────────────────────────────
// Full audit trail of all system actions loaded from Supabase activity_log table

import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

const TYPE_CLS = {
  Alert:      'bd-danger',
  Incident:   'bd-warning',
  Evacuation: 'bd-success',
  Resource:   'bd-info',
  Resident:   'bd-purple',
  User:       'bd-neutral',
  Auth:       'bd-info',
  System:     'bd-neutral',
}

export default function ActivityLogPage() {
  const { activityLog, refresh } = useApp()
  const [refreshing, setRefreshing] = useState(false)
  const [search,     setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  // Pull fresh data every time this page is opened
  useEffect(() => {
    setRefreshing(true)
    refresh().finally(() => setRefreshing(false))
  }, []) // eslint-disable-line

  const handleRefresh = async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }

  const handleExport = () => {
    const rows = [
      'Log ID,Action,Type,User,Urgent,Timestamp',
      ...activityLog.map(l =>
        `"${l.id}","${(l.action || '').replace(/"/g, "'")}","${l.type}","${l.userName}","${l.urgent ? 'Yes' : 'No'}","${l.createdAt}"`
      ),
    ].join('\n')
    const url = URL.createObjectURL(new Blob([rows], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `IDRMS_ActivityLog_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const types = ['All', ...new Set(activityLog.map(l => l.type).filter(Boolean))]

  const filtered = activityLog.filter(l => {
    const matchSearch = !search || (l.action || '').toLowerCase().includes(search.toLowerCase()) || (l.userName || '').toLowerCase().includes(search.toLowerCase())
    const matchType   = typeFilter === 'All' || l.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <div>
      <div className="page-hdr">
        <div>
          <div className="page-title">Activity Log</div>
          <div className="page-sub">Complete audit trail — {activityLog.length} records</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleRefresh} disabled={refreshing} type="button">
            <i className={'fa-solid ' + (refreshing ? 'fa-spinner fa-spin' : 'fa-rotate-right')}></i>
            {refreshing ? ' Loading…' : ' Refresh'}
          </button>
          <button className="btn btn-secondary" onClick={handleExport} type="button">
            <i className="fa-solid fa-download"></i> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-row">
        <div className="search-wrap" style={{ flex: 1, maxWidth: 300 }}>
          <i className="fa-solid fa-magnifying-glass"></i>
          <input
            className="form-ctrl search-inp"
            placeholder="Search actions or users..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-ctrl" style={{ width: 140 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--t2)' }}>{filtered.length} records</span>
      </div>

      {refreshing && activityLog.length === 0 ? (
        <div className="empty">
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 32, opacity: .5 }}></i>
          <p>Loading activity log…</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Action</th>
                  <th>Type</th>
                  <th>User</th>
                  <th>Priority</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id || i}>
                    <td>
                      <span className="log-mono">{filtered.length - i}</span>
                    </td>
                    <td className="log-action">{log.action || '—'}</td>
                    <td>
                      <span className={'badge ' + (TYPE_CLS[log.type] || 'bd-neutral')}>
                        {log.type || 'System'}
                      </span>
                    </td>
                    <td>
                      <div className="log-user">
                        <div className="log-avatar">
                          {(log.userName || 'S')[0].toUpperCase()}
                        </div>
                        {log.userName || 'System'}
                      </div>
                    </td>
                    <td>
                      {log.urgent
                        ? <span className="badge bd-danger"><i className="fa-solid fa-circle-exclamation"></i> Urgent</span>
                        : <span className="log-normal">Normal</span>}
                    </td>
                    <td className="log-time">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString('en-PH', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !refreshing && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty">
                        <i className="fa-solid fa-clock-rotate-left"></i>
                        <p>{activityLog.length === 0 ? 'No activity yet. Perform actions in the system and they will appear here.' : 'No records match your filter.'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
