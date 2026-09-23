import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../App'

const LEAD_OPTIONS = [
  { value: 24,  label: '24 hours before' },
  { value: 48,  label: '48 hours before' },
  { value: 72,  label: '72 hours before' },
  { value: 168, label: '1 week before' },
]

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'America/Toronto', 'America/Vancouver', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
  'Australia/Sydney',
]

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
        {title}
      </h2>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </div>
    </section>
  )
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 500 }}>{label}</div>
        {description && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>{description}</div>}
      </div>
      <button
        role="switch" aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          flexShrink: 0,
          width: 40, height: 22,
          borderRadius: 11,
          background: checked ? 'var(--accent)' : 'var(--border)',
          border: 'none',
          padding: 0,
          position: 'relative',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          position: 'absolute',
          top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.15s',
          display: 'block',
        }} />
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()

  // Canvas token
  const [tokenStatus, setTokenStatus] = useState(null)
  const [tokenForm, setTokenForm] = useState({ canvas_base_url: '', api_token: '' })
  const [tokenMsg, setTokenMsg] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)

  // Preferences
  const [prefs, setPrefs] = useState(null)
  const [prefsMsg, setPrefsMsg] = useState('')
  const [prefsLoading, setPrefsLoading] = useState(false)

  // Danger zone
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    api.token.status().then(setTokenStatus).catch(() => {})
    api.prefs.get().then(setPrefs).catch(() => {})
  }, [])

  const saveToken = async (e) => {
    e.preventDefault()
    setTokenMsg(''); setTokenError(''); setTokenLoading(true)
    try {
      await api.token.save(tokenForm)
      const status = await api.token.status()
      setTokenStatus(status)
      setTokenForm({ canvas_base_url: '', api_token: '' })
      setTokenMsg('Token saved and verified.')
    } catch (err) {
      setTokenError(err.message)
    } finally {
      setTokenLoading(false)
    }
  }

  const removeToken = async () => {
    await api.token.remove()
    setTokenStatus({ connected: false })
    setTokenMsg('Token removed.')
  }

  const updatePref = async (key, value) => {
    const updated = { ...prefs, [key]: value }
    setPrefs(updated)
    setPrefsLoading(true)
    try {
      await api.prefs.update({ [key]: value })
      setPrefsMsg('Saved.')
      setTimeout(() => setPrefsMsg(''), 2000)
    } catch (err) {
      setPrefsMsg('')
    } finally {
      setPrefsLoading(false)
    }
  }

  const toggleLeadHour = (hours) => {
    const current = prefs.lead_hours || [24]
    const next = current.includes(hours)
      ? current.filter(h => h !== hours)
      : [...current, hours].sort((a, b) => a - b)
    if (next.length === 0) return
    updatePref('lead_hours', next)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'delete my account') {
      setDeleteError('Type the phrase exactly to confirm.')
      return
    }
    await api.auth.deleteAccount()
    logout()
  }

  return (
    <div>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 28 }}>Settings</h1>

      {/* Canvas Token */}
      <Section title="Canvas Account">
        {tokenStatus?.connected ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="badge badge-ok">Connected</span>
              <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{tokenStatus.canvas_base_url}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16 }}>
              Your token is encrypted and stored securely. It is never returned by the API.
            </p>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={removeToken}>
              Disconnect token
            </button>
          </div>
        ) : (
          <form onSubmit={saveToken} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label>Canvas URL</label>
              <input
                type="url" placeholder="https://canvas.instructure.com" required
                value={tokenForm.canvas_base_url}
                onChange={e => setTokenForm(f => ({ ...f, canvas_base_url: e.target.value }))}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                Your institution's Canvas base URL — just the domain, no path.
              </p>
            </div>
            <div>
              <label>API Token</label>
              <input
                type="password" placeholder="1396~…" required
                value={tokenForm.api_token}
                onChange={e => setTokenForm(f => ({ ...f, api_token: e.target.value }))}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                Canvas → Account → Settings → Approved Integrations → New Access Token
              </p>
            </div>
            {tokenError && <p className="error-msg">{tokenError}</p>}
            {tokenMsg   && <p className="success-msg">{tokenMsg}</p>}
            <button type="submit" className="btn-primary" disabled={tokenLoading} style={{ alignSelf: 'flex-start' }}>
              {tokenLoading ? 'Verifying…' : 'Connect account'}
            </button>
          </form>
        )}
        {tokenMsg && tokenStatus?.connected && <p className="success-msg">{tokenMsg}</p>}
      </Section>

      {/* Notification Preferences */}
      {prefs && (
        <Section title="Notifications">
          <Toggle
            label="Email notifications"
            description="Receive reminders at your account email address"
            checked={prefs.email_enabled}
            onChange={v => updatePref('email_enabled', v)}
          />
          <hr className="divider" style={{ margin: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Notify me this far in advance</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {LEAD_OPTIONS.map(opt => {
                const active = (prefs.lead_hours || [24]).includes(opt.value)
                return (
                  <button
                    key={opt.value}
                    onClick={() => toggleLeadHour(opt.value)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 20,
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                      background: active ? 'var(--accent-bg)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--ink-2)',
                      fontSize: 13,
                      fontWeight: active ? 500 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
          <hr className="divider" style={{ margin: 0 }} />
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label>Daily check time</label>
              <select
                value={prefs.run_hour}
                onChange={e => updatePref('run_hour', Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {new Date(0, 0, 0, i).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label>Timezone</label>
              <select
                value={prefs.timezone}
                onChange={e => updatePref('timezone', e.target.value)}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
          {prefsMsg && <p className="success-msg">{prefsMsg}</p>}
        </Section>
      )}

      {/* Danger zone */}
      <Section title="Danger Zone">
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Delete account</div>
          <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
            Permanently deletes your account, Canvas token, and all notification history.
            This cannot be undone.
          </p>
          <input
            placeholder='Type "delete my account" to confirm'
            value={deleteConfirm}
            onChange={e => setDeleteConfirm(e.target.value)}
            style={{ marginBottom: 10 }}
          />
          {deleteError && <p className="error-msg" style={{ marginBottom: 10 }}>{deleteError}</p>}
          <button
            className="btn-danger"
            onClick={handleDeleteAccount}
            disabled={deleteConfirm !== 'delete my account'}
          >
            Delete my account
          </button>
        </div>
      </Section>
    </div>
  )
}
