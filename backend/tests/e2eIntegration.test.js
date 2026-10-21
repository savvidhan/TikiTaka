import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { User, Team, Player, Match } from '../src/models/index.js';
import { generateToken, COOKIE_NAME } from '../src/utils/jwt.js';

describe('TikiTaka Step H: End-to-End Auth, Role & Ownership Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const createQueryMock = (result) => ({
    select: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject)
  });

  const mockUserById = (userDoc) => {
    mock.method(User, 'findById', () => createQueryMock(userDoc));
  };

  const createTestUser = (role, customId = null, isActive = true) => {
    const id = customId || new mongoose.Types.ObjectId();
    const userDoc = {
      _id: id,
      name: `${role} Test User`,
      email: `${role.toLowerCase()}-${id.toString().slice(-4)}@tikitaka.test`,
      role,
      isActive
    };
    const token = generateToken(userDoc);
    return {
      id,
      userDoc,
      token,
      cookieHeader: `${COOKIE_NAME}=${token}`,
      authHeaders: {
        'Content-Type': 'application/json',
        Cookie: `${COOKIE_NAME}=${token}`
      }
    };
  };

  // ==========================================
  // 1. REGISTRATION SESSION ESTABLISHMENT
  // ==========================================
  describe('Registration & Immediate Session Establishment', () => {
    it('should register a Spectator and immediately issue an HTTP-only session cookie', async () => {
      mock.method(User, 'findOne', () => createQueryMock(null));
      mock.method(User.prototype, 'save', async function () { return this; });

      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Spectator',
          email: 'new-spec@tikitaka.test',
          password: 'Password123!',
          role: 'Spectator'
        })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.role, 'Spectator');
      assert.ok(body.token);

      // Verify Set-Cookie header is issued
      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie);
      assert.match(setCookie, new RegExp(`${COOKIE_NAME}=`));
      assert.match(setCookie, /HttpOnly/i);
    });

    it('should register a TeamManager and immediately issue an HTTP-only session cookie', async () => {
      mock.method(User, 'findOne', () => createQueryMock(null));
      mock.method(User.prototype, 'save', async function () { return this; });

      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Manager',
          email: 'new-mgr@tikitaka.test',
          password: 'Password123!',
          role: 'TeamManager'
        })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.role, 'TeamManager');
      assert.ok(body.token);

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie);
      assert.match(setCookie, new RegExp(`${COOKIE_NAME}=`));
    });

    it('should reject registration attempts with duplicate email (409)', async () => {
      const existingUser = { _id: new mongoose.Types.ObjectId(), email: 'existing@tikitaka.test' };
      mock.method(User, 'findOne', () => createQueryMock(existingUser));

      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate',
          email: 'existing@tikitaka.test',
          password: 'Password123!'
        })
      });

      assert.equal(res.status, 409);
      const body = await res.json();
      assert.match(body.message, /already exists/i);
    });

    it('should reject registration with unauthorized role Admin or Referee (400)', async () => {
      const res = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker',
          email: 'hack@tikitaka.test',
          password: 'Password123!',
          role: 'Admin'
        })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.message, /Registration as Admin is not permitted/i);
    });
  });

  // ==========================================
  // 2. LOGIN, SESSION RESTORATION & LOGOUT
  // ==========================================
  describe('Login, Session Verification & Logout Lifecycle', () => {
    it('should log in with valid credentials, set cookie, and restore session via /auth/me', async () => {
      const userId = new mongoose.Types.ObjectId();
      const rawPassword = 'Password123!';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(rawPassword, salt);

      const dbUser = new User({
        _id: userId,
        name: 'Login User',
        email: 'login-test@tikitaka.test',
        password: hashedPassword,
        role: 'TeamManager',
        isActive: true
      });

      mock.method(User, 'findOne', () => createQueryMock(dbUser));
      mock.method(User, 'findById', () => createQueryMock(dbUser));

      // 1. Perform login
      const loginRes = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'login-test@tikitaka.test',
          password: rawPassword
        })
      });

      assert.equal(loginRes.status, 200);
      const loginBody = await loginRes.json();
      assert.equal(loginBody.success, true);
      assert.equal(loginBody.data.role, 'TeamManager');

      const setCookie = loginRes.headers.get('set-cookie');
      assert.ok(setCookie);
      const tokenMatch = setCookie.match(/tikitaka_token=([^;]+)/);
      assert.ok(tokenMatch);
      const sessionCookie = tokenMatch[1];

      // 2. Restore session using the session cookie
      const meRes = await fetch(`${baseUrl}/auth/me`, {
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`
        }
      });

      assert.equal(meRes.status, 200);
      const meBody = await meRes.json();
      assert.equal(meBody.success, true);
      assert.equal(meBody.data.email, 'login-test@tikitaka.test');
      assert.equal(meBody.data.role, 'TeamManager');
      assert.equal(meBody.data.password, undefined);

      // 3. Log out and verify cookie is cleared
      const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
        method: 'POST',
        headers: {
          Cookie: `${COOKIE_NAME}=${sessionCookie}`
        }
      });

      assert.equal(logoutRes.status, 200);
      const logoutCookie = logoutRes.headers.get('set-cookie');
      assert.ok(logoutCookie);
      assert.match(logoutCookie, /(Expires=Thu, 01 Jan 1970|Max-Age=0)/i);
    });

    it('should reject login with wrong password (401)', async () => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', salt);

      const dbUser = new User({
        _id: new mongoose.Types.ObjectId(),
        name: 'Wrong Pass User',
        email: 'wrong-pass@tikitaka.test',
        password: hashedPassword,
        role: 'Spectator',
        isActive: true
      });

      mock.method(User, 'findOne', () => createQueryMock(dbUser));

      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'wrong-pass@tikitaka.test',
          password: 'IncorrectPassword999!'
        })
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.message, /Invalid email or password/i);
    });

    it('should reject deactivated account from logging in or calling /auth/me (403)', async () => {
      const inactiveUser = createTestUser('Spectator', null, false);
      mockUserById(inactiveUser.userDoc);

      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: inactiveUser.authHeaders
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /deactivated/i);
    });

    it('should reject invalid or tampered cookie on protected endpoints (401)', async () => {
      const res = await fetch(`${baseUrl}/auth/me`, {
        headers: {
          Cookie: `${COOKIE_NAME}=tampered.bogus.jwt.token`
        }
      });

      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.message, /invalid or malformed/i);
    });
  });

  // ==========================================
  // 3. ROLE & OWNERSHIP POLICY INTEGRATION
  // ==========================================
  describe('Live Role Boundaries & Ownership Verification', () => {
    it('should allow Spectator to read public teams but reject team creation (403)', async () => {
      const spectator = createTestUser('Spectator');
      mockUserById(spectator.userDoc);

      // Public read succeeds
      mock.method(Team, 'find', () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => [{ _id: new mongoose.Types.ObjectId(), name: 'Public Team', roster: [] }]
          })
        })
      }));

      const readRes = await fetch(`${baseUrl}/teams`);
      assert.equal(readRes.status, 200);

      // Mutation is strictly forbidden
      const createRes = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: spectator.authHeaders,
        body: JSON.stringify({ name: 'Spectator FC', shortName: 'SFC' })
      });

      assert.equal(createRes.status, 403);
      const createBody = await createRes.json();
      assert.match(createBody.message, /Forbidden: Role "Spectator"/i);
    });

    it('should allow TeamManager to manage their own team, but deny modifying another manager team (403)', async () => {
      const managerA = createTestUser('TeamManager');
      const managerB = createTestUser('TeamManager');

      mockUserById(managerA.userDoc);

      // Team owned by Manager B
      const teamB = {
        _id: new mongoose.Types.ObjectId(),
        name: 'Manager B Club',
        manager: managerB.id,
        isActive: true,
        save: async function () { return this; }
      };

      mock.method(Team, 'findById', async () => teamB);

      const updateRes = await fetch(`${baseUrl}/teams/${teamB._id}`, {
        method: 'PATCH',
        headers: managerA.authHeaders,
        body: JSON.stringify({ name: 'Hacked Club' })
      });

      assert.equal(updateRes.status, 403);
      const body = await updateRes.json();
      assert.match(body.message, /You do not have permission to manage this team/i);
    });

    it('should deny TeamManager from starting a match (Live status) with 403', async () => {
      const manager = createTestUser('TeamManager');
      mockUserById(manager.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const matchDoc = {
        _id: matchId,
        status: 'Scheduled',
        homeTeam: { manager: manager.id },
        awayTeam: { manager: manager.id }
      };

      mock.method(Match, 'findById', async () => matchDoc);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Only Referees and Admins can start or complete matches/i);
    });

    it('should allow assigned Referee to start match, but deny unassigned Referee (403)', async () => {
      const assignedRef = createTestUser('Referee');
      const otherRef = createTestUser('Referee');

      const matchId = new mongoose.Types.ObjectId();
      const matchDoc = {
        _id: matchId,
        status: 'Scheduled',
        referee: assignedRef.id,
        homeTeam: new mongoose.Types.ObjectId(),
        awayTeam: new mongoose.Types.ObjectId(),
        save: async function () { return this; },
        populate: async function () { return this; }
      };

      // 1. Assigned Referee CAN start match
      mockUserById(assignedRef.userDoc);
      mock.method(Match, 'findById', async () => matchDoc);

      const okRes = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: assignedRef.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });
      assert.equal(okRes.status, 200);

      // 2. Unassigned Referee CANNOT start match
      mock.restoreAll();
      matchDoc.status = 'Scheduled'; // reset
      mockUserById(otherRef.userDoc);
      mock.method(Match, 'findById', async () => matchDoc);

      const denyRes = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: otherRef.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });
      assert.equal(denyRes.status, 403);
      const denyBody = await denyRes.json();
      assert.match(denyBody.message, /not the assigned referee/i);
    });

    it('should deny Referee from cancelling matches with 403', async () => {
      const referee = createTestUser('Referee');
      mockUserById(referee.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const matchDoc = {
        _id: matchId,
        status: 'Scheduled',
        referee: referee.id
      };

      mock.method(Match, 'findById', async () => matchDoc);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /not authorized to cancel matches/i);
    });
  });

  // ==========================================
  // 4. CORS & CREDENTIALS BEHAVIOR
  // ==========================================
  describe('CORS and Cookie Transmission Verification', () => {
    it('should include Access-Control-Allow-Credentials: true for approved frontend origin', async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: {
          Origin: 'http://localhost:5173'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    });

    it('should not reflect unapproved origins', async () => {
      const res = await fetch(`${baseUrl}/health`, {
        headers: {
          Origin: 'http://malicious-site.test'
        }
      });

      assert.equal(res.status, 200);
      assert.notEqual(res.headers.get('access-control-allow-origin'), 'http://malicious-site.test');
    });
  });
});
