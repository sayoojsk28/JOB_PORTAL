
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

  const logout = () => {
  removeAccessToken();
  setUser(null);
  window.location.href = '/';
};

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
