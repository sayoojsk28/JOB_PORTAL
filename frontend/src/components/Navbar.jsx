
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import camerinLogo from '../assets/camerin.png';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === '/';

  const isAdminPage = location.pathname.startsWith('/admin');

  const getDashboardRoute = () => {
    if (!user) return '/';

    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'employee':
        return '/employee/dashboard';
      case 'student':
        return '/student/dashboard';
      default:
        return '/';
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/login/admin', { replace: true });
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={camerinLogo}
            alt="Camerin Innovate"
            className="h-16 w-auto max-w-[260px] object-contain"
          />
        </Link>

        <div className="flex items-center gap-3">
          {user?.role === 'admin' && isAdminPage ? (
            <>
              {location.pathname !== '/admin/dashboard' && (
                <Link
                  to="/admin/dashboard"
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  Dashboard
                </Link>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                Sign out
              </button>
            </>
          ) : isHomePage ? (
            <Link
              to="/login/admin"
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:px-6"
            >
              Admin Login
              <span className="ml-2" aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
