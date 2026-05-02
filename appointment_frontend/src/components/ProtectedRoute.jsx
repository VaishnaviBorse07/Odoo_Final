// Route guard — requires auth and redirects by role (customer vs organiser vs admin paths).
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function ProtectedRoute({ roles }) {
  const { isAuthenticated, user } = useAuth();
  const loc = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }

  if (roles && !roles.includes(user.role)) {
    if (user.role === 'customer') return <Navigate to="/" replace />;
    if (user.role === 'organiser') return <Navigate to="/organiser" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'customer' && loc.pathname.startsWith('/organiser')) {
    return <Navigate to="/" replace />;
  }
  if (user.role === 'customer' && loc.pathname.startsWith('/admin')) {
    return <Navigate to="/" replace />;
  }
  if (user.role === 'organiser' && loc.pathname.startsWith('/admin')) {
    return <Navigate to="/organiser" replace />;
  }

  return <Outlet />;
}
