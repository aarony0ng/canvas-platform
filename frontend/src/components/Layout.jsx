import { NavLink } from 'react-router-dom'
import { useAuth } from '../App'

export default function Layout({ children }) {
  const { user, logout } = useAuth()

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        height: 52,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--accent)', marginRight: 8 }}>
          Canvas Checker
        </span>
        <NavLink to="/" style={({ isActive }) => ({
          fontSize: 14, color: isActive ? 'var(--ink)' : 'var(--ink-2)',
          fontWeight: isActive ? 500 : 400,
        })}>Dashboard</NavLink>
        <NavLink to="/settings" style={({ isActive }) => ({
          fontSize: 14, color: isActive ? 'var(--ink)' : 'var(--ink-2)',
          fontWeight: isActive ? 500 : 400,
        })}>Settings</NavLink>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>{user?.email}</span>
          <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: 13 }} onClick={logout}>
            Log out
          </button>
        </div>
      </nav>
      <main style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '36px 24px' }}>
        {children}
      </main>
    </div>
  )
}
