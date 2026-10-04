import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../App'

export default function Login() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.auth.login(form)
      const me = await api.auth.me()
      setUser(me)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Logo mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48,
            background: 'linear-gradient(135deg, #F97316, #EA580C)',
            borderRadius: 14,
            boxShadow: '0 0 32px rgba(249,115,22,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22,
          }}>✓</div>
        </div>

        <h1 style={{ fontWeight: 700, fontSize: 26, marginBottom: 6, textAlign: 'center', letterSpacing: '-0.03em' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 32, textAlign: 'center' }}>
          Sign in to your Canvas Checker account
        </p>

        <form
          className="card"
          onSubmit={submit}
          style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 28 }}
        >
          <div>
            <label>Email</label>
            <input
              type="email" required autoFocus
              placeholder="you@university.edu"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label>Password</label>
            <input
              type="password" required
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--danger-bg)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 20, textAlign: 'center' }}>
          No account?{' '}
          <Link to="/signup" style={{ fontWeight: 500 }}>Create one</Link>
        </p>
      </div>
    </div>
  )
}
