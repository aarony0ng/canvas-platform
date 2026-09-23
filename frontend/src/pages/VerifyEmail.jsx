import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState('verifying') // verifying | success | error
  const [message, setMessage] = useState('')
  const calledRef = useRef(false)

  const token = params.get('token')

  useEffect(() => {
    if (calledRef.current) return
    calledRef.current = true

    if (!token) {
      setStatus('error')
      setMessage('No verification token provided.')
      return
    }
    api.auth.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(err => { setStatus('error'); setMessage(err.message) })
  }, [token])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="card" style={{ maxWidth: 380, width: '100%', textAlign: 'center' }}>
        {status === 'verifying' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Verifying…</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Email verified!</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
              Your account is now active.
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Sign in
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div style={{ fontSize: 32, marginBottom: 16 }}>❌</div>
            <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Verification failed</h2>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
              {message || 'This link is invalid or has already been used.'}
            </p>
            <Link to="/signup" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Back to signup
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
