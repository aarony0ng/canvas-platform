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
      <div className="card card-glow" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 48 }}>
        <div style={{ fontSize: 48, marginBottom: 20 }}>📬</div>
        <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 10, letterSpacing: '-0.02em' }}>
          Check your email
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7 }}>
          We sent a verification link to{' '}
          <span style={{ color: 'var(--ink)', fontWeight: 500 }}>{form.email}</span>.
          <br />Click it to activate your account.
        </p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

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
          Create your account
        </h1>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 32, textAlign: 'center' }}>
          Get daily reminders for your Canvas assignments
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
            <label>Password <span style={{ color: 'var(--ink-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(8+ characters)</span></label>
            <input
              type="password" required minLength={8}
              placeholder="••••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.6 }}>
            By creating an account you agree to our Terms of Service and Privacy Policy.
            Your Canvas token is encrypted and never shared.
          </p>

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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 20, textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ fontWeight: 500 }}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
