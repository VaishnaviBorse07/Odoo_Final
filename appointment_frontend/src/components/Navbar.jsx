// Role-aware top navigation — logo, primary links, click-based profile dropdown.
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F6E56] text-white font-extrabold text-base shadow-sm">
        Z
      </span>
      <span className="text-lg font-extrabold text-gray-900 tracking-tight">ZenFlow</span>
    </Link>
  );
}

function navLink(isActive) {
  return isActive
    ? 'text-[#0F6E56] font-bold'
    : 'text-gray-600 font-semibold hover:text-[#0F6E56] transition-colors';
}

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Unauthenticated navbar ────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <header className="border-b border-slate-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl border border-[#0F6E56] px-4 py-2 text-sm font-bold text-[#0F6E56] hover:bg-[#E1F5EE] transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/signup"
              className="rounded-xl bg-[#0F6E56] px-4 py-2 text-sm font-bold text-white hover:bg-[#1D9E75] transition-colors shadow-sm"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // ── Initials avatar ───────────────────────────────────────────────────────
  const initials = (user.full_name || user.email || '?')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    setOpen(false);
    logout();
  };

  // ── Authenticated navbar ──────────────────────────────────────────────────
  return (
    <header className="border-b border-slate-100 bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Logo />

        {/* ── Nav links ── */}
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          {user.role === 'customer' && (
            <NavLink to="/home" className={({ isActive }) => navLink(isActive)}>
              Browse Classes
            </NavLink>
          )}
          {(user.role === 'organiser' || user.role === 'admin') && (
            <>
              <NavLink to="/organiser" className={({ isActive }) => navLink(isActive)}>
                My Classes
              </NavLink>
              <NavLink to="/organiser/reports" className={({ isActive }) => navLink(isActive)}>
                Reports
              </NavLink>
            </>
          )}
          {user.role === 'admin' && (
            <>
              <NavLink to="/admin" className={({ isActive }) => navLink(isActive)}>
                Dashboard
              </NavLink>
              <NavLink to="/admin/users" className={({ isActive }) => navLink(isActive)}>
                Users
              </NavLink>
            </>
          )}
        </nav>

        {/* ── Profile dropdown ── */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:border-[#0F6E56]/40 hover:bg-[#E1F5EE] transition-all duration-150 shadow-sm"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0F6E56] text-xs font-extrabold text-white">
              {initials}
            </span>
            <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[100px] truncate">
              {user.full_name?.split(' ')[0] || 'Account'}
            </span>
            {/* Chevron */}
            <svg
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ── Dropdown Menu ── */}
          {open && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-100 bg-white shadow-xl z-50 overflow-hidden animate-in">

              {/* User info header */}
              <div className="px-4 py-3 bg-[#E1F5EE] border-b border-[#0F6E56]/10">
                <p className="text-sm font-extrabold text-gray-900 truncate">{user.full_name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                <span className="mt-1.5 inline-block rounded-full bg-[#0F6E56]/10 px-2 py-0.5 text-[10px] font-bold text-[#0F6E56] uppercase tracking-wider">
                  {user.role}
                </span>
              </div>

              {/* Links */}
              <div className="py-1">
                {user.role === 'customer' && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); nav('/home'); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 transition-colors"
                    >
                      <span></span> Browse Classes
                    </button>
                    <button
                      type="button"
                      onClick={() => { setOpen(false); nav('/profile'); }}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 transition-colors"
                    >
                      <span></span> My Bookings
                    </button>
                  </>
                )}
                {(user.role === 'organiser' || user.role === 'admin') && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); nav('/organiser'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 transition-colors"
                  >
                    <span></span> My Classes
                  </button>
                )}
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => { setOpen(false); nav('/admin'); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-slate-50 transition-colors"
                  >
                    <span></span> Admin Panel
                  </button>
                )}
              </div>

              {/* Logout */}
              <div className="border-t border-slate-100 py-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
                  </svg>
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
