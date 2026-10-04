import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../App'

function timeUntil(isoDate) {
  const due = new Date(isoDate)
  const now = new Date()
  const hours = Math.round((due - now) / 36e5)
  if (hours < 1)   return 'Due very soon'
  if (hours < 24)  return `Due in ${hours}h`
  const days = Math.floor(hours / 24)
  return `Due in ${days}d ${hours % 24}h`
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function AssignmentRow({ assignment }) {
  const due = new Date(assignment.due_at)
  const hoursAway = (due - new Date()) / 36e5
  const urgent = hoursAway < 24

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '6px 16px',
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
      alignItems: 'start',
    }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          {urgent && <span className="badge badge-urgent">Due soon</span>}
          {assignment.url
            ? <a href={assignment.url} target="_blank" rel="noreferrer" style={{ fontWeight: 500, fontSize: 14, color: 'var(--ink)' }}>
                {assignment.name}
              </a>
            : <span style={{ fontWeight: 500, fontSize: 14 }}>{assignment.name}</span>
          }
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
          {assignment.course_name}
          {assignment.points != null && ` · ${assignment.points} pts`}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: urgent ? 'var(--accent)' : 'var(--ink-2)' }}>
          {timeUntil(assignment.due_at)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{formatDate(assignment.due_at)}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.assignments.upcoming()
      .then(setAssignments)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={{ color: 'var(--ink-3)' }}>Fetching your assignments…</p>

  if (error?.includes('Canvas token')) return (
    <div>
      <h1 style={{ fontWeight: 600, fontSize: 20, marginBottom: 24 }}>Get started</h1>
      <div className="card" style={{ padding: 32, marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 20 }}>
          Setup checklist
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {[
            {
              n: 1,
              title: 'Connect your Canvas account',
              desc: 'Add your school\'s Canvas URL and generate an API token so we can fetch your assignments.',
              done: false,
            },
            {
              n: 2,
              title: 'Set your notification preferences',
              desc: 'Choose how far in advance you want reminders and what time to check each day.',
              done: false,
            },
            {
              n: 3,
              title: 'You\'re all set',
              desc: 'Your upcoming assignments will appear here and you\'ll get email reminders automatically.',
              done: false,
            },
          ].map((step, i) => (
            <div key={i} style={{
              display: 'flex', gap: 16, alignItems: 'flex-start',
              paddingBottom: i < 2 ? 20 : 0,
              marginBottom: i < 2 ? 20 : 0,
              borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                background: i === 0 ? 'var(--accent)' : 'var(--border)',
                color: i === 0 ? '#fff' : 'var(--ink-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600,
              }}>
                {step.n}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, color: i === 0 ? 'var(--ink)' : 'var(--ink-3)' }}>
                  {step.title}
                </div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.5 }}>{step.desc}</div>
                {i === 0 && (
                  <Link to="/settings">
                    <button className="btn-primary" style={{ marginTop: 14, fontSize: 13 }}>
                      Connect Canvas →
                    </button>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (error) return <p className="error-msg">{error}</p>

  const urgent   = assignments.filter(a => (new Date(a.due_at) - new Date()) / 36e5 < 24)
  const upcoming = assignments.filter(a => (new Date(a.due_at) - new Date()) / 36e5 >= 24)

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontWeight: 600, fontSize: 20 }}>Upcoming Assignments</h1>
        <p style={{ fontSize: 14, color: 'var(--ink-3)', marginTop: 4 }}>
          {assignments.length === 0
            ? 'No upcoming assignments — enjoy the break.'
            : `${assignments.length} assignment${assignments.length !== 1 ? 's' : ''} coming up`
          }
        </p>
      </div>

      {urgent.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            Due in 24 hours
          </h2>
          {urgent.map(a => <AssignmentRow key={a.id + a.due_at} assignment={a} />)}
        </div>
      )}

      {upcoming.length > 0 && (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
            Coming up
          </h2>
          {upcoming.map(a => <AssignmentRow key={a.id + a.due_at} assignment={a} />)}
        </div>
      )}

      {assignments.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--ink-3)' }}>
          Nothing due. Check back later.
        </div>
      )}
    </div>
  )
}
