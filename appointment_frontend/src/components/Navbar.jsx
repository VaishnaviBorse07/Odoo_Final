// Role-aware top navigation — logo, primary links, profile menu or auth buttons.
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zen-primary text-lg font-extrabold text-white">
        Z
      </span>
      <span className="text-lg font-extrabold text-zen-ink">ZenFlow</span>
    </Link>
  );
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo />
          <div className="flex gap-3">
            <Link
              to="/login"
              className="rounded-control border border-zen-primary px-4 py-2 text-sm font-semibold text-zen-primary hover:bg-zen-secondary"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-control bg-zen-primary px-4 py-2 text-sm font-semibold text-white hover:bg-zen-accent"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  const initials = (user.full_name || user.email || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Logo />
        <nav className="flex flex-1 flex-wrap items-center justify-end gap-4 text-sm font-semibold text-zen-ink">
          {user.role === 'customer' && (
            <>
              <NavLink to="/" className={({ isActive }) => (isActive ? 'text-zen-primary' : 'hover:text-zen-primary')}>
                Browse Classes
              </NavLink>
            </>
          )}
          {(user.role === 'organiser' || user.role === 'admin') && (
            <>
              <NavLink
                to="/organiser"
                className={({ isActive }) => (isActive ? 'text-zen-primary' : 'hover:text-zen-primary')}
              >
                My Classes
              </NavLink>
              <NavLink
                to="/organiser/reports"
                className={({ isActive }) => (isActive ? 'text-zen-primary' : 'hover:text-zen-primary')}
              >
                Reports
              </NavLink>
            </>
          )}
          {user.role === 'admin' && (
            <>
              <NavLink to="/admin" className={({ isActive }) => (isActive ? 'text-zen-primary' : 'hover:text-zen-primary')}>
                Dashboard
              </NavLink>
              <NavLink
                to="/admin/users"
                className={({ isActive }) => (isActive ? 'text-zen-primary' : 'hover:text-zen-primary')}
              >
                Users
              </NavLink>
            </>
          )}
          <div className="relative group">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-zen-secondary text-sm font-bold text-zen-primary ring-1 ring-zen-primary/20"
            >
              {initials}
            </button>
            <div className="absolute right-0 top-12 hidden min-w-[10rem] rounded-control border border-slate-200 bg-white py-2 shadow-lg group-hover:block">
              {user.role === 'customer' && (
                <Link to="/profile" className="block px-4 py-2 hover:bg-slate-50">
                  My Bookings
                </Link>
              )}
              <button type="button" onClick={logout} className="block w-full px-4 py-2 text-left hover:bg-slate-50">
                Log Out
              </button>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
