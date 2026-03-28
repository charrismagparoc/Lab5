import { useState } from 'react'
import { supabaseProblem } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter email and password.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await onLogin(email.trim(), password)
      if (!res.success) setError(res.error || 'Login failed.')
    } catch (err) {
      setError(err?.message || 'Unexpected error during login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-pg">
      <div className="login-card">
        <div className="login-logo">
          <i className="fa-solid fa-shield-heart"></i>
        </div>
        <h1 className="login-title">IDRMS</h1>
        <p className="login-sub">
          Integrated Disaster Risk Management System<br />
          Barangay Kauswagan, Cagayan de Oro City
        </p>
        <div className="login-brgy">
          <i className="fa-solid fa-location-dot"></i> BDRRMC Kauswagan
        </div>

        {supabaseProblem && (
          <div className="login-err login-warn">⚠ {supabaseProblem}</div>
        )}

        <form className="login-form" onSubmit={submit} noValidate>
          <div className="form-grp">
            <label className="login-lbl" htmlFor="login-email">Email Address</label>
            <input
              id="login-email"
              className="login-inp"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@kauswagan.gov.ph"
              autoComplete="email"
              required
            />
          </div>
          <div className="form-grp">
            <label className="login-lbl" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              className="login-inp"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>
          {error && <div className="login-err" role="alert">⚠ {error}</div>}
          <button className="btn btn-primary login-btn" type="submit" disabled={loading}>
            {loading
              ? <><i className="fa-solid fa-spinner fa-spin"></i> Signing in...</>
              : <><i className="fa-solid fa-right-to-bracket"></i> Sign In</>}
          </button>
        </form>

        <div className="login-footer"></div>
      </div>
    </div>
  )
}
