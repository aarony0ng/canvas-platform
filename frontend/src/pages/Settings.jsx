import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../App'

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Anchorage', 'Pacific/Honolulu',
  'America/Toronto', 'America/Vancouver', 'Europe/London',
  'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Kolkata',
  'Australia/Sydney',
]

function hoursToDisplay(h) {
  if (h % 168 === 0) return { value: h / 168, unit: 'weeks' }
  if (h % 24 === 0)  return { value: h / 24,  unit: 'days' }
  return { value: h, unit: 'hours' }
}

function displayToHours(value, unit) {
  if (unit === 'weeks') return value * 168
  if (unit === 'days')  return value * 24
  return value
}

function formatLeadLabel(h) {
  const { value, unit } = hoursToDisplay(h)
  return `${value} ${value === 1 ? unit.slice(0, -1) : unit} before`
}

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
          flexShrink: 0, width: 40, height: 22, borderRadius: 11,
          background: checked ? 'var(--accent)' : 'var(--border)',
          border: 'none', padding: 0, position: 'relative', transition: 'background 0.15s', cursor: 'pointer',
        }}
      >
        <span style={{
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left 0.15s', display: 'block',
        }} />
      </button>
    </div>
  )
}

function TokenGuide() {
  const [open, setOpen] = useState(false)
  const steps = [
    'Log in to your Canvas account in a new tab.',
    'Click your profile picture in the top-right corner → select Account → Settings.',
    'Scroll down to the "Approved Integrations" section.',
    'Click "+ New Access Token".',
    'Set the Purpose to "Canvas Checker" and leave Expires blank.',
    'Click Generate Token, then copy the full token and paste it in the field above.',
  ]
  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <span style={{ fontSize: 11 }}>{open ? '▾' : '▸'}</span>
        How do I generate a Canvas API token?
      </button>
      {open && (
        <ol style={{ margin: '10px 0 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {steps.map((step, i) => (
            <li key={i} style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

function UrlHelp() {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginTop: 4 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', padding: 0,
          color: 'var(--accent)', fontSize: 12, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 4,
        }}
      >
        <span style={{ fontSize: 11 }}>{open ? '▾' : '▸'}</span>
        How do I find my Canvas URL?
      </button>
      {open && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          <p style={{ marginBottom: 8 }}>
            Your Canvas URL is the domain you visit to log in to Canvas — just the base address, no path after it.
          </p>
          <p style={{ marginBottom: 6, fontWeight: 500 }}>Common examples:</p>
          <ul style={{ paddingLeft: 18, margin: '0 0 8px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <li>Columbia University: <code style={{ fontSize: 12, background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>https://canvas.columbia.edu</code></li>
            <li>Canvas default: <code style={{ fontSize: 12, background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>https://canvas.instructure.com</code></li>
            <li>Many schools: <code style={{ fontSize: 12, background: 'var(--border)', padding: '1px 5px', borderRadius: 4 }}>https://canvas.[yourschool].edu</code></li>
          </ul>
          <p style={{ color: 'var(--ink-3)' }}>
            Tip: open Canvas in your browser, copy everything up to (but not including) the first <code style={{ fontSize: 12 }}>/</code> after the domain.
          </p>
        </div>
      )}
    </div>
  )
}

const PRESETS = [
  { label: '24 hours', hours: 24 },
  { label: '2 days',   hours: 48 },
  { label: '1 week',   hours: 168 },
]

function LeadHoursPicker({ value, onChange }) {
  const [inputVal, setInputVal] = useState(1)
  const [inputUnit, setInputUnit] = useState('days')

  const toggle = (h) => {
    if (value.includes(h)) {
      if (value.length <= 1) return
      onChange(value.filter(x => x !== h))
    } else {
      onChange([...value, h].sort((a, b) => a - b))
    }
  }

  const add = () => {
    const hours = displayToHours(Number(inputVal), inputUnit)
    if (!hours || hours < 1) return
    if (value.includes(hours)) return
    onChange([...value, hours].sort((a, b) => a - b))
  }

  const remove = (h) => {
    if (value.length <= 1) return
    onChange(value.filter(x => x !== h))
  }

  const customValues = value.filter(h => !PRESETS.some(p => p.hours === h))

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>Notify me this far in advance</div>

      {/* Presets */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {PRESETS.map(({ label, hours }) => {
          const active = value.includes(hours)
          return (
            <button
              key={hours}
              type="button"
              onClick={() => toggle(hours)}
              style={{
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                background: active ? 'var(--accent-bg)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--ink-2)',
                fontSize: 13, fontWeight: active ? 500 : 400,
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Custom chips (non-preset values) */}
      {customValues.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {customValues.map(h => (
            <span key={h} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 20,
              border: '1px solid var(--accent)',
              background: 'var(--accent-bg)',
              color: 'var(--accent)', fontSize: 13, fontWeight: 500,
            }}>
              {formatLeadLabel(h)}
              <button
                type="button"
                onClick={() => remove(h)}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--accent)', fontSize: 14, lineHeight: 1, opacity: 0.7,
                }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Custom input */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number" min="1" max="999"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          style={{ width: 70, marginBottom: 0 }}
        />
        <select
          value={inputUnit}
          onChange={e => setInputUnit(e.target.value)}
          style={{ width: 110, marginBottom: 0 }}
        >
          <option value="hours">hours</option>
          <option value="days">days</option>
          <option value="weeks">weeks</option>
        </select>
        <button
          type="button"
          onClick={add}
          className="btn-ghost"
          style={{ fontSize: 13, padding: '7px 14px' }}
        >
          + Custom
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, logout } = useAuth()

  const [tokenStatus, setTokenStatus] = useState(null)
  const [tokenForm, setTokenForm] = useState({ canvas_base_url: '', api_token: '' })
  const [tokenMsg, setTokenMsg] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)

  const [prefs, setPrefs] = useState(null)
  const [prefsMsg, setPrefsMsg] = useState('')
  const [prefsLoading, setPrefsLoading] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const [testLoading, setTestLoading] = useState(false)

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
    } catch {
      setPrefsMsg('')
    } finally {
      setPrefsLoading(false)
    }
  }

  const sendTestEmail = async () => {
    setTestMsg(''); setTestLoading(true)
    try {
      const res = await api.assignments.testEmail()
      setTestMsg(res.message)
    } catch (err) {
      setTestMsg(err.message)
    } finally {
      setTestLoading(false)
    }
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
            {tokenMsg && <p className="success-msg" style={{ marginTop: 10 }}>{tokenMsg}</p>}
          </div>
        ) : (
          <form onSubmit={saveToken} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label>Canvas URL</label>
              <input
                type="url" placeholder="https://canvas.columbia.edu" required
                value={tokenForm.canvas_base_url}
                onChange={e => setTokenForm(f => ({ ...f, canvas_base_url: e.target.value }))}
              />
              <p style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4 }}>
                Your school's Canvas domain — just the base URL, no path (e.g. <code style={{ fontSize: 11 }}>https://canvas.columbia.edu</code>).
              </p>
              <UrlHelp />
            </div>
            <div>
              <label>API Token</label>
              <input
                type="password" placeholder="1396~…" required
                value={tokenForm.api_token}
                onChange={e => setTokenForm(f => ({ ...f, api_token: e.target.value }))}
              />
              <TokenGuide />
            </div>
            {tokenError && <p className="error-msg">{tokenError}</p>}
            {tokenMsg   && <p className="success-msg">{tokenMsg}</p>}
            <button type="submit" className="btn-primary" disabled={tokenLoading} style={{ alignSelf: 'flex-start' }}>
              {tokenLoading ? 'Verifying…' : 'Connect account'}
            </button>
          </form>
        )}
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
          <LeadHoursPicker
            value={prefs.lead_hours || [24]}
            onChange={v => updatePref('lead_hours', v)}
          />
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
          <hr className="divider" style={{ margin: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Test your notifications</div>
            <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 12 }}>
              Send yourself an email right now with your current upcoming assignments.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={sendTestEmail}
                disabled={testLoading}
                style={{ fontSize: 13 }}
              >
                {testLoading ? 'Sending…' : '✉ Send test email'}
              </button>
              {testMsg && <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{testMsg}</span>}
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
            Permanently deletes your account, Canvas token, and all notification history. This cannot be undone.
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
