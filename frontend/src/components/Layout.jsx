import { NavLink } from 'react-router-dom'
import { useAuth } from '../App'

export default function Layout({ children }) {
  const { user, logout } = useAuth()

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(9,9,11,0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '0 28px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        height: 56,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20 }}>
          <div style={{
            width: 26, height: 26,
            background: 'linear-gradient(135deg, #F97316, #EA580C)',
            borderRadius: 7,
            boxShadow: '0 0 12px rgba(249,115,22,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13,
          }}>✓</div>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#fff', letterSpacing: '-0.02em' }}>
            Canvas Checker
          </span>
        </div>

        {/* Nav links */}
        <NavLink to="/" style={({ isActive }) => ({
          fontSize: 14,
          color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
          fontWeight: isActive ? 500 : 400,
          padding: '6px 12px',
          borderRadius: 8,
          background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
          transition: 'all 0.15s',
          letterSpacing: '-0.01em',
        })}>Dashboard</NavLink>
        <NavLink to="/settings" style={({ isActive }) => ({
          fontSize: 14,
          color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
          fontWeight: isActive ? 500 : 400,
          padding: '6px 12px',
          borderRadius: 8,
          background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
          transition: 'all 0.15s',
          letterSpacing: '-0.01em',
        })}>Settings</NavLink>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', letterSpacing: '-0.01em' }}>
            {user?.email}
          </span>
          <button
            className="btn-ghost"
            style={{ padding: '6px 14px', fontSize: 13 }}
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </nav>

      <main style={{
        flex: 1,
        maxWidth: 780,
        width: '100%',
        margin: '0 auto',
        padding: '48px 28px',
      }}>
        {children}
      </main>
    </div>
  )
}
