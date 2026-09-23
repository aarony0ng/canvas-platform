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
    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>🔗</div>
      <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Connect your Canvas account</h2>
      <p style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 20 }}>
        Add your Canvas API token in Settings to start receiving assignment reminders.
      </p>
      <Link to="/settings"><button className="btn-primary">Go to Settings</button></Link>
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
