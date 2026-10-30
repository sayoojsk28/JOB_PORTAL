
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import camerinLogo from '../assets/camerin.png';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);

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

  // Fetch student notifications
  const fetchNotifications = async () => {
    if (!isStudent) return;

    try {
      setNotificationLoading(true);

      const response = await api.get('/student/notifications');

      setNotifications(response.data);
    } catch (err) {
      console.error('Notification fetch error:', err);
    } finally {
      setNotificationLoading(false);
    }
  };

  // Fetch notifications when student logs in
  useEffect(() => {
    if (isStudent) {
      fetchNotifications();
    } else {
      setNotifications([]);
      setShowNotifications(false);
    }
  }, [isStudent]);

  const unreadCount = notifications.filter(
    (item) => !item.is_read
  ).length;

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleNotificationClick = async () => {
  const nextState = !showNotifications;

  setShowNotifications(nextState);

  if (nextState) {
    try {
      await fetchNotifications();

      await api.patch('/student/notifications/read');

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );

    } catch (err) {
      console.error('Unable to mark notifications as read:', err);
    }
  }
};

  const handleSignOut = () => {
    logout();
    setShowNotifications(false);
    setNotifications([]);

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
                onClick={handleNotificationClick}
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

                {/* Unread notification count */}
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-40 cursor-default"
                    aria-label="Close notifications"
                    onClick={() => setShowNotifications(false)}
                  />

                  <div className="absolute right-0 top-14 z-50 w-[min(350px,calc(100vw-32px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">

                    <div className="flex items-center justify-between border-b border-slate-100 p-4">
                      <div>
                        <h3 className="font-semibold text-slate-800">
                          Notifications
                        </h3>

                        <p className="mt-1 text-xs text-slate-500">
                          {unreadCount > 0
                            ? `${unreadCount} unread notification(s)`
                            : 'You are all caught up'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                      >
                        Close
                      </button>
                    </div>

                    <div className="max-h-[350px] overflow-y-auto">

                      {notificationLoading ? (
                        <p className="p-6 text-center text-sm text-slate-500">
                          Loading notifications...
                        </p>
                      ) : notifications.length === 0 ? (
                        <p className="p-6 text-center text-sm text-slate-500">
                          No notifications yet.
                        </p>
                      ) : (
                        notifications.map((item) => (
                          <div
                            key={item.notification_id}
                            className={`border-b border-slate-100 p-4 last:border-b-0 ${
                              !item.is_read ? 'bg-blue-50/70' : 'bg-white'
                            }`}
                          >
                            <div className="flex items-start gap-3">

                              <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
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
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-semibold text-slate-800">
                                    Application Update
                                  </h4>

                                  {!item.is_read && (
                                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                                  )}
                                </div>

                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                  {item.message}
                                </p>

                                <p className="mt-2 text-xs text-slate-400">
                                  {formatDate(item.created_at)}
                                </p>
                              </div>

                            </div>
                          </div>
                        ))
                      )}

                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Dashboard button */}
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
