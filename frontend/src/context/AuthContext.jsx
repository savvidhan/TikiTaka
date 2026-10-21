import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getCurrentUser, loginUser, registerUser, logoutUser } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const hasInitialized = useRef(false);

  /**
   * Restore/refresh current authenticated user from backend session cookie
   */
  const refreshUser = useCallback(async () => {
    try {
      setAuthError(null);
      const res = await getCurrentUser();
      if (res?.success && res?.data) {
        setUser(res.data);
        return res.data;
      } else {
        setUser(null);
        return null;
      }
    } catch (err) {
      // 401 simply means guest/unauthenticated; not an application crash
      setUser(null);
      if (err.status !== 401) {
        setAuthError(err.message || 'Failed to authenticate session');
      }
      return null;
    }
  }, []);

  // Initial session restoration on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initSession() {
      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [refreshUser]);

  /**
   * Login action using credentials; cookie is set automatically by backend
   */
  const login = useCallback(async (email, password) => {
    setAuthError(null);
    try {
      const response = await loginUser({ email, password });
      if (response?.success && response?.data) {
        setUser(response.data);
        return { success: true, user: response.data, message: response.message };
      }
      throw new Error(response?.message || 'Login failed');
    } catch (err) {
      const errorMsg = err?.data?.message || err.message || 'Login failed';
      setAuthError(errorMsg);
      throw err;
    }
  }, []);

  const register = useCallback(async ({ name, email, password, role }) => {
    setAuthError(null);
    try {
      const response = await registerUser({ name, email, password, role });
      if (response?.success && response?.data) {
        setUser(response.data);
      }
      return response;
    } catch (err) {
      const errorMsg = err?.data?.message || err.message || 'Registration failed';
      setAuthError(errorMsg);
      throw err;
    }
  }, []);

  /**
   * Logout action: clears backend cookie and frontend user state
   */
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      // Even if network or server error, always clear local state
      console.warn('Logout request encountered an issue, clearing local state:', err.message);
    } finally {
      setUser(null);
      setAuthError(null);
    }
  }, []);

  /**
   * Direct user update helper (e.g. for profile changes)
   */
  const updateUser = useCallback((newUserData) => {
    setUser((prev) => (prev ? { ...prev, ...newUserData } : newUserData));
  }, []);

  /**
   * Role check helper
   */
  const hasRole = useCallback(
    (allowedRoles) => {
      if (!user) return false;
      if (!allowedRoles) return true;
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      return rolesArray.includes(user.role);
    },
    [user]
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      isAuthenticated: Boolean(user),
      role: user?.role || null,
      isAdmin: user?.role === 'Admin',
      isTeamManager: user?.role === 'TeamManager',
      isReferee: user?.role === 'Referee',
      isSpectator: user?.role === 'Spectator',
      hasRole,
      login,
      register,
      logout,
      refreshUser,
      updateUser
    }),
    [user, loading, authError, hasRole, login, register, logout, refreshUser, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { AuthContext };
export default AuthProvider;
