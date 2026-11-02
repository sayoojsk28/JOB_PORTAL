
import { createContext, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import {
  getAccessToken,
  setAccessToken,
  removeAccessToken,
} from '../utils/authHelper';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    const token = getAccessToken();

    if (token) {
      try {
        const decoded = jwtDecode(token);

        if (decoded.exp * 1000 > Date.now()) {
          setUser(decoded);
        } else {
          removeAccessToken();
        }
      } catch {
        removeAccessToken();
      }
    }

    setLoading(false);
  }, []);

  const login = (accessToken) => {
    setAccessToken(accessToken);
    const decoded = jwtDecode(accessToken);
    setUser(decoded);
  };

  // Opens the confirmation dialog instead of logging out immediately.
  const logout = () => {
    setShowLogoutDialog(true);
  };

  // Performs the actual logout only after confirmation.
  const confirmLogout = () => {
    removeAccessToken();
    setUser(null);
    setShowLogoutDialog(false);
    window.location.href = '/';
  };

  const cancelLogout = () => {
    setShowLogoutDialog(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading }}
    >
      {children}

      {showLogoutDialog && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
            </div>

            <h2
              id="logout-dialog-title"
              className="text-xl font-bold text-slate-900"
            >
              Sign out?
            </h2>

            <p
              id="logout-dialog-description"
              className="mt-2 text-sm leading-6 text-slate-500"
            >
              Are you sure you want to sign out of your account?
            </p>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelLogout}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 focus:outline-none focus:ring-4 focus:ring-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-100"
              >
                Yes, Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
