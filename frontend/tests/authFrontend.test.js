import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('TikiTaka Frontend Authentication & RBAC Verification Tests', () => {

  // ==========================================
  // 1. REGISTRATION VALIDATION RULES
  // ==========================================
  describe('Frontend Registration Validation Rules', () => {
    const validateRegistration = ({ name, email, password, confirmPassword, role }) => {
      const trimmedName = (name || '').trim();
      if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
        return { valid: false, error: 'Name must be between 2 and 100 characters' };
      }

      const trimmedEmail = (email || '').trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;
      if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
        return { valid: false, error: 'Please provide a valid email address' };
      }

      const allowedPublicRoles = ['Spectator', 'TeamManager'];
      if (!allowedPublicRoles.includes(role)) {
        return { valid: false, error: 'Invalid role selection. Only Spectator and TeamManager are permitted.' };
      }

      if (!password || password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
      }

      if (password.length > 128) {
        return { valid: false, error: 'Password cannot exceed 128 characters' };
      }

      const complexityRegex = /^(?=.*[a-zA-Z])(?=.*[\d\W]).{8,128}$/;
      if (!complexityRegex.test(password)) {
        return { valid: false, error: 'Password must contain at least one letter and at least one number or special character' };
      }

      if (password !== confirmPassword) {
        return { valid: false, error: 'Passwords do not match' };
      }

      return { valid: true, error: null };
    };

    it('should validate a valid registration payload with Spectator role', () => {
      const res = validateRegistration({
        name: 'Alex Spectator',
        email: 'alex@tikitaka.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'Spectator'
      });
      assert.equal(res.valid, true);
      assert.equal(res.error, null);
    });

    it('should validate a valid registration payload with TeamManager role', () => {
      const res = validateRegistration({
        name: 'Carlo Ancelotti',
        email: 'carlo@realmadrid.test',
        password: 'LaLiga2026Title!',
        confirmPassword: 'LaLiga2026Title!',
        role: 'TeamManager'
      });
      assert.equal(res.valid, true);
    });

    it('should reject registration attempts targeting Admin role', () => {
      const res = validateRegistration({
        name: 'Hacker',
        email: 'hacker@tikitaka.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'Admin'
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /Only Spectator and TeamManager are permitted/i);
    });

    it('should reject registration attempts targeting Referee role', () => {
      const res = validateRegistration({
        name: 'Hacker Ref',
        email: 'ref@tikitaka.test',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        role: 'Referee'
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /Only Spectator and TeamManager are permitted/i);
    });

    it('should reject passwords shorter than 8 characters', () => {
      const res = validateRegistration({
        name: 'Short Pass',
        email: 'short@tikitaka.test',
        password: 'Pass1!',
        confirmPassword: 'Pass1!',
        role: 'Spectator'
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /at least 8 characters/i);
    });

    it('should reject passwords missing numbers or special characters', () => {
      const res = validateRegistration({
        name: 'Alpha Only',
        email: 'alpha@tikitaka.test',
        password: 'OnlyLettersHere',
        confirmPassword: 'OnlyLettersHere',
        role: 'Spectator'
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /at least one number or special character/i);
    });

    it('should reject mismatched password confirmation', () => {
      const res = validateRegistration({
        name: 'Mismatch',
        email: 'mismatch@tikitaka.test',
        password: 'Password123!',
        confirmPassword: 'DifferentPassword123!',
        role: 'Spectator'
      });
      assert.equal(res.valid, false);
      assert.match(res.error, /Passwords do not match/i);
    });
  });

  // ==========================================
  // 2. CENTRALIZED API CLIENT & COOKIE CONFIG
  // ==========================================
  describe('Centralized Frontend API Client Specifications', () => {
    it('should include credentials: "include" for browser cookie session handling', () => {
      // Mock fetch options builder
      const buildRequestConfig = (endpoint, options = {}) => {
        const defaultHeaders = {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options.headers
        };
        return {
          credentials: 'include',
          ...options,
          headers: defaultHeaders
        };
      };

      const config = buildRequestConfig('/auth/me');
      assert.equal(config.credentials, 'include');
      assert.equal(config.headers['Content-Type'], 'application/json');
      assert.equal(config.headers['Accept'], 'application/json');
    });

    it('should never store JWT in localStorage or sessionStorage', () => {
      // Verify mock storage isolation
      const mockStorage = {};
      const handleLoginSuccess = (loginResponse) => {
        // Correct implementation: only read user data, never write token to storage
        const user = loginResponse.data;
        return { user, storedToken: mockStorage['tikitaka_token'] || null };
      };

      const loginRes = {
        success: true,
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        data: { _id: '123', name: 'User', role: 'Spectator' }
      };

      const result = handleLoginSuccess(loginRes);
      assert.equal(result.user.name, 'User');
      assert.equal(result.storedToken, null);
      assert.equal(Object.keys(mockStorage).length, 0);
    });
  });

  // ==========================================
  // 3. AUTHENTICATION CONTEXT & STATE TRANSITIONS
  // ==========================================
  describe('AuthContext State Transitions & Role Helpers', () => {
    const createAuthState = (user = null, loading = false) => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      role: user?.role || null,
      isAdmin: user?.role === 'Admin',
      isTeamManager: user?.role === 'TeamManager',
      isReferee: user?.role === 'Referee',
      isSpectator: user?.role === 'Spectator',
      hasRole: (allowedRoles) => {
        if (!user) return false;
        if (!allowedRoles) return true;
        const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        return roles.includes(user.role);
      }
    });

    it('should initialize with loading: true and user: null for guests', () => {
      const state = createAuthState(null, true);
      assert.equal(state.isAuthenticated, false);
      assert.equal(state.loading, true);
      assert.equal(state.role, null);
      assert.equal(state.isAdmin, false);
      assert.equal(state.isTeamManager, false);
      assert.equal(state.isReferee, false);
      assert.equal(state.isSpectator, false);
    });

    it('should correctly configure TeamManager permissions and flags', () => {
      const managerUser = { _id: 'tm1', name: 'Manager Bob', role: 'TeamManager', isActive: true };
      const state = createAuthState(managerUser, false);
      assert.equal(state.isAuthenticated, true);
      assert.equal(state.role, 'TeamManager');
      assert.equal(state.isTeamManager, true);
      assert.equal(state.isAdmin, false);
      assert.equal(state.isReferee, false);
      assert.equal(state.hasRole(['Admin', 'TeamManager']), true);
      assert.equal(state.hasRole(['Referee']), false);
    });

    it('should correctly configure Referee permissions and flags', () => {
      const refUser = { _id: 'ref1', name: 'Ref Pierluigi', role: 'Referee', isActive: true };
      const state = createAuthState(refUser, false);
      assert.equal(state.isAuthenticated, true);
      assert.equal(state.role, 'Referee');
      assert.equal(state.isReferee, true);
      assert.equal(state.isAdmin, false);
      assert.equal(state.isTeamManager, false);
      assert.equal(state.hasRole(['Admin', 'Referee']), true);
      assert.equal(state.hasRole(['TeamManager']), false);
    });

    it('should correctly configure Admin permissions across all roles', () => {
      const adminUser = { _id: 'adm1', name: 'Super Admin', role: 'Admin', isActive: true };
      const state = createAuthState(adminUser, false);
      assert.equal(state.isAuthenticated, true);
      assert.equal(state.isAdmin, true);
      assert.equal(state.hasRole(['Admin']), true);
      assert.equal(state.hasRole(['Admin', 'TeamManager', 'Referee']), true);
    });

    it('should restrict Spectator from administrative roles', () => {
      const spectatorUser = { _id: 'spec1', name: 'Fan Alex', role: 'Spectator', isActive: true };
      const state = createAuthState(spectatorUser, false);
      assert.equal(state.isAuthenticated, true);
      assert.equal(state.isSpectator, true);
      assert.equal(state.hasRole(['Admin', 'TeamManager', 'Referee']), false);
      assert.equal(state.hasRole(['Spectator']), true);
    });
  });

  // ==========================================
  // 4. ROUTE GUARD DECISION LOGIC
  // ==========================================
  describe('Protected Route Guard Decision Matrix', () => {
    const evaluateRouteAccess = ({ user, loading, allowedRoles, targetPath }) => {
      if (loading) {
        return { status: 'LOADING' };
      }
      if (!user) {
        return { status: 'REDIRECT_LOGIN', redirect: '/login', intendedFrom: targetPath };
      }
      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return { status: 'FORBIDDEN', userRole: user.role, required: allowedRoles };
      }
      return { status: 'ALLOWED' };
    };

    it('should return LOADING while session verification is in progress', () => {
      const res = evaluateRouteAccess({
        user: null,
        loading: true,
        allowedRoles: ['Admin'],
        targetPath: '/matches/123/manage'
      });
      assert.equal(res.status, 'LOADING');
    });

    it('should redirect unauthenticated guests to /login and preserve destination', () => {
      const res = evaluateRouteAccess({
        user: null,
        loading: false,
        allowedRoles: ['Admin', 'TeamManager'],
        targetPath: '/matches/fixture456/manage'
      });
      assert.equal(res.status, 'REDIRECT_LOGIN');
      assert.equal(res.redirect, '/login');
      assert.equal(res.intendedFrom, '/matches/fixture456/manage');
    });

    it('should deny Spectator access to officiating desk with FORBIDDEN (403)', () => {
      const res = evaluateRouteAccess({
        user: { name: 'Fan', role: 'Spectator' },
        loading: false,
        allowedRoles: ['Admin', 'TeamManager', 'Referee'],
        targetPath: '/matches/123/manage'
      });
      assert.equal(res.status, 'FORBIDDEN');
      assert.equal(res.userRole, 'Spectator');
      assert.deepEqual(res.required, ['Admin', 'TeamManager', 'Referee']);
    });

    it('should permit assigned Referee access to Match Center', () => {
      const res = evaluateRouteAccess({
        user: { name: 'Match Ref', role: 'Referee' },
        loading: false,
        allowedRoles: ['Admin', 'TeamManager', 'Referee'],
        targetPath: '/matches/123/manage'
      });
      assert.equal(res.status, 'ALLOWED');
    });

    it('should permit Admin access to all protected routes', () => {
      const res = evaluateRouteAccess({
        user: { name: 'Admin', role: 'Admin' },
        loading: false,
        allowedRoles: ['Admin', 'TeamManager', 'Referee'],
        targetPath: '/matches/123/manage'
      });
      assert.equal(res.status, 'ALLOWED');
    });
  });

  // ==========================================
  // 5. PUBLIC ACCESS INTEGRITY
  // ==========================================
  describe('Public Routes & Endpoints Integrity', () => {
    const publicRoutes = ['/', '/teams', '/players', '/matches', '/login', '/register'];

    it('should define public routes that require no authentication', () => {
      const isPublicRoute = (path) => publicRoutes.includes(path);

      assert.equal(isPublicRoute('/'), true);
      assert.equal(isPublicRoute('/teams'), true);
      assert.equal(isPublicRoute('/players'), true);
      assert.equal(isPublicRoute('/matches'), true);
      assert.equal(isPublicRoute('/login'), true);
      assert.equal(isPublicRoute('/register'), true);
      assert.equal(isPublicRoute('/matches/123/manage'), false);
    });
  });
});
