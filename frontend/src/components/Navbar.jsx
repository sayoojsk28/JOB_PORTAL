
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import camerinLogo from '../assets/camerin.png';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);

  const isHomePage = location.pathname === '/';
  const isStudent = user?.role === 'student';
  const isAdmin = user?.role === 'admin';

  const dashboardRoutes = {
    admin: '/admin/dashboard',
    employee: '/employee/dashboard',
    student: '/student/dashboard',
  };

  const dashboardRoute = user
    ? dashboardRoutes[user.role]
    : null;

  const isDashboardPage =
    dashboardRoute && location.pathname === dashboardRoute;

  const handleSignOut = () => {
    logout();
    setShowNotifications(false);

    // Preserve the existing admin logout behaviour.
    if (isAdmin) {
      navigate('/login/admin', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
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

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Student notifications only */}
          {isStudent && (
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowNotifications((previous) => !previous)
                }
                className="relative rounded-xl border border-slate-200 p-3 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
                aria-label="Student notifications"
                aria-expanded={showNotifications}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
                  <path d="M10 21h4" />
                </svg>
              </button>

              {showNotifications && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close notifications"
                    onClick={() => setShowNotifications(false)}
                  />

                  <div className="absolute right-0 top-14 z-50 w-[min(320px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-slate-800">
                        Notifications
                      </h3>

                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                      >
                        Close
                      </button>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      Application updates, interview confirmations and
                      interview results will appear here.
                    </p>

                    <p className="mt-3 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                      Notifications will be connected to the backend
                      in the next step.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dashboard button: hidden on the current role's dashboard */}
          {user && dashboardRoute && !isDashboardPage && (
            <Link
              to={dashboardRoute}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700 sm:px-4"
            >
              Dashboard
            </Link>
          )}

          {/* Sign out */}
          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 sm:px-4"
            >
              Sign out
            </button>
          )}

          {/* Public home page */}
          {!user && isHomePage && (
            <Link
              to="/login/admin"
              className="inline-flex items-center justify-center rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:px-6"
            >
              Admin Login
              <span className="ml-2" aria-hidden="true">
                →
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
