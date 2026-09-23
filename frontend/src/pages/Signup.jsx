import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

export default function Signup() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.auth.signup(form)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>📬</div>
        <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Check your email</h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>
          We sent a verification link to <strong>{form.email}</strong>.<br />
          Click it to activate your account.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ fontWeight: 600, fontSize: 22, marginBottom: 6 }}>Create account</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 28 }}>
          Get daily reminders for your Canvas assignments.
        </p>
        <form className="card" onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label>Email</label>
            <input
              type="email" required autoFocus
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label>Password <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(8+ characters)</span></label>
            <input
              type="password" required minLength={8}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5 }}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
            Your Canvas token is encrypted and never shared.
          </p>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 16, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
