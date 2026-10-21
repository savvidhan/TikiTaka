import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User, Match, Team, Player } from '../src/models/index.js';
import { generateToken } from '../src/utils/jwt.js';
import { authorize, authorizeMatchStatus } from '../src/middleware/auth.js';

describe('TikiTaka Role-Based Access Control (RBAC) Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start Express app on an ephemeral port for isolated testing
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

  /**
   * Helper to create thenable findById mock for User model
   */
  const mockUserById = (userDoc) => {
    mock.method(User, 'findById', () => ({
      select: () => Promise.resolve(userDoc),
      then: (resolve, reject) => Promise.resolve(userDoc).then(resolve, reject),
      catch: (reject) => Promise.resolve(userDoc).catch(reject)
    }));
  };

  /**
   * Helper to generate a test user and corresponding bearer token
   */
  const createRoleUser = (role) => {
    const id = new mongoose.Types.ObjectId();
    const userDoc = {
      _id: id,
      name: `${role} Test User`,
      email: `${role.toLowerCase()}@tikitaka.test`,
      role,
      isActive: true
    };
    const token = generateToken(userDoc);
    return { id, userDoc, token, authHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
  };

  // ==========================================
  // 1. AUTHORIZE MIDDLEWARE UNIT BEHAVIOR
  // ==========================================
  describe('Authorize Middleware Core Behavior', () => {
    it('1. should return 401 when authorize is called without authenticated req.user', () => {
      const authMiddleware = authorize('Admin');
      let statusCalled = null;
      let jsonCalled = null;

      const req = {}; // No req.user
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (payload) => { jsonCalled = payload; }
          };
        }
      };
      const next = () => { assert.fail('next() should not be called'); };

      authMiddleware(req, res, next);
      assert.equal(statusCalled, 401);
      assert.equal(jsonCalled.success, false);
      assert.match(jsonCalled.message, /Authentication required/i);
    });

    it('should throw error when authorize is configured with empty or invalid roles', () => {
      assert.throws(() => authorize(), /Invalid authorization configuration/i);
      assert.throws(() => authorize('SuperGodMode'), /Invalid authorization configuration/i);
    });

    it('2. should permit execution when authenticated user role is allowed', () => {
      const authMiddleware = authorize('Admin', 'TeamManager');
      const req = { user: { role: 'TeamManager' } };
      let nextCalled = false;
      const res = {};
      const next = () => { nextCalled = true; };

      authMiddleware(req, res, next);
      assert.equal(nextCalled, true);
    });

    it('should return 403 when authenticated user role is not in allowed roles', () => {
      const authMiddleware = authorize('Admin');
      let statusCalled = null;
      let jsonCalled = null;

      const req = { user: { role: 'Spectator' } };
      const res = {
        status: (code) => {
          statusCalled = code;
          return {
            json: (payload) => { jsonCalled = payload; }
          };
        }
      };
      const next = () => { assert.fail('next() should not be called'); };

      authMiddleware(req, res, next);
      assert.equal(statusCalled, 403);
      assert.equal(jsonCalled.success, false);
      assert.match(jsonCalled.message, /Forbidden.*Role "Spectator" is not authorized/i);
    });
  });

  // ==========================================
  // 2. SPECTATOR ROLE RESTRICTIONS (NEVER MUTATES)
  // ==========================================
  describe('3. Spectator Role Boundaries (Forbidden on All Mutations)', () => {
    let spectator;

    beforeEach(() => {
      spectator = createRoleUser('Spectator');
      mockUserById(spectator.userDoc);
    });

    it('should reject Spectator attempting to create a team with 403', async () => {
      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: spectator.authHeaders,
        body: JSON.stringify({ name: 'Spectator FC' })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    it('should reject Spectator attempting to create a player with 403', async () => {
      const res = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: spectator.authHeaders,
        body: JSON.stringify({ firstName: 'Unauthorized', lastName: 'Player' })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    it('should reject Spectator attempting to create a match with 403', async () => {
      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: spectator.authHeaders,
        body: JSON.stringify({ title: 'Spectator Cup' })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    it('should reject Spectator attempting to record a goal with 403', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: spectator.authHeaders,
        body: JSON.stringify({ minute: 10 })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });

    it('should reject Spectator attempting to change match status with 403', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: spectator.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Spectators are not permitted to change match status/i);
    });

    it('should reject Spectator attempting to delete a match with 403', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/matches/${matchId}`, {
        method: 'DELETE',
        headers: spectator.authHeaders
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden/i);
    });
  });

  // ==========================================
  // 3. TEAM MANAGER PERMISSIONS & BOUNDARIES
  // ==========================================
  describe('4 & 5. TeamManager Permissions and Boundaries', () => {
    let manager;

    beforeEach(() => {
      manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);
    });

    it('4. TeamManager CAN create teams, players, and match fixtures', async () => {
      // 1. Team creation allowed (fails on validation, proving authorization passed!)
      const teamRes = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({}) // Empty body causes controller 400 validation error, NOT 403!
      });
      assert.notEqual(teamRes.status, 403);
      assert.equal(teamRes.status, 400);

      // 2. Player creation allowed
      const playerRes = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({})
      });
      assert.notEqual(playerRes.status, 403);
      assert.equal(playerRes.status, 400);

      // 3. Match creation allowed
      const matchRes = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({})
      });
      assert.notEqual(matchRes.status, 403);
      assert.equal(matchRes.status, 400);
    });

    it('4. TeamManager CAN cancel a scheduled match', async () => {
      const matchId = new mongoose.Types.ObjectId();
      mock.method(Match, 'findById', async () => ({
        _id: matchId,
        homeTeam: { _id: new mongoose.Types.ObjectId(), manager: manager.userDoc._id },
        awayTeam: { _id: new mongoose.Types.ObjectId(), manager: manager.userDoc._id },
        status: 'Scheduled',
        save: async function () { return this; },
        populate: async function () { return this; }
      }));

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.notEqual(res.status, 403);
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    it('5. TeamManager CANNOT start a match (status: "Live") with 403', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Only Referees and Admins can start or complete matches/i);
    });

    it('5. TeamManager CANNOT complete a match (status: "Completed") with 403', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ status: 'Completed' })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Only Referees and Admins can start or complete matches/i);
    });

    it('5. TeamManager CANNOT record match goals with 403', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({ minute: 20 })
      });
      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*Role "TeamManager" is not authorized/i);
    });
  });

  // ==========================================
  // 4. REFEREE PERMISSIONS & BOUNDARIES
  // ==========================================
  describe('6 & 7. Referee Permissions and Boundaries', () => {
    let referee;

    beforeEach(() => {
      referee = createRoleUser('Referee');
      mockUserById(referee.userDoc);
    });

    it('6. Referee CAN start a match (status: "Live")', async () => {
      const matchId = new mongoose.Types.ObjectId();
      mock.method(Match, 'findById', async () => ({
        _id: matchId,
        referee: referee.userDoc._id,
        status: 'Scheduled',
        save: async function () { return this; },
        populate: async function () { return this; }
      }));

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });

      assert.notEqual(res.status, 403);
      assert.equal(res.status, 200);
    });

    it('6. Referee CAN complete a match (status: "Completed")', async () => {
      const matchId = new mongoose.Types.ObjectId();
      mock.method(Match, 'findById', async () => ({
        _id: matchId,
        referee: referee.userDoc._id,
        status: 'Live',
        save: async function () { return this; },
        populate: async function () { return this; }
      }));

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Completed' })
      });

      assert.notEqual(res.status, 403);
      assert.equal(res.status, 200);
    });

    it('6. Referee CAN record goals during live match', async () => {
      const matchId = new mongoose.Types.ObjectId();
      mock.method(Match, 'findById', async () => null);

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: referee.authHeaders,
        body: JSON.stringify({}) // Reaches controller (404), proving auth passed!
      });

      assert.notEqual(res.status, 403);
      assert.equal(res.status, 404);
    });

    it('7. Referee CANNOT cancel matches (status: "Cancelled") with 403', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Only Team Managers and Admins can cancel/i);
    });

    it('7. Referee CANNOT create or manage teams with 403', async () => {
      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: referee.authHeaders,
        body: JSON.stringify({ name: 'Ref FC' })
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.match(body.message, /Forbidden.*Role "Referee" is not authorized/i);
    });

    it('7. Referee CANNOT create or manage players with 403', async () => {
      const res = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: referee.authHeaders,
        body: JSON.stringify({ firstName: 'Ref', lastName: 'Player' })
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.match(body.message, /Forbidden.*Role "Referee" is not authorized/i);
    });

    it('7. Referee CANNOT schedule or delete matches with 403', async () => {
      const createRes = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: referee.authHeaders,
        body: JSON.stringify({ title: 'Ref Match' })
      });
      assert.equal(createRes.status, 403);

      const deleteRes = await fetch(`${baseUrl}/matches/${new mongoose.Types.ObjectId()}`, {
        method: 'DELETE',
        headers: referee.authHeaders
      });
      assert.equal(deleteRes.status, 403);
    });
  });

  // ==========================================
  // 5. ADMIN ROLE MASTER PERMISSIONS
  // ==========================================
  describe('8. Admin Role Full Administrative Permissions', () => {
    let admin;

    beforeEach(() => {
      admin = createRoleUser('Admin');
      mockUserById(admin.userDoc);
    });

    it('8. Admin can perform team, player, and match creation', async () => {
      const teamRes = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: admin.authHeaders,
        body: JSON.stringify({})
      });
      assert.notEqual(teamRes.status, 403);

      const playerRes = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: admin.authHeaders,
        body: JSON.stringify({})
      });
      assert.notEqual(playerRes.status, 403);

      const matchRes = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: admin.authHeaders,
        body: JSON.stringify({})
      });
      assert.notEqual(matchRes.status, 403);
    });

    it('8 & 9. Admin can perform all match status transitions (Live, Completed, Cancelled)', async () => {
      const matchId = new mongoose.Types.ObjectId();
      mock.method(Match, 'findById', async () => ({
        _id: matchId,
        status: 'Scheduled',
        save: async function () { return this; },
        populate: async function () { return this; }
      }));

      // Admin starting match
      const liveRes = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: admin.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });
      assert.notEqual(liveRes.status, 403);
      assert.equal(liveRes.status, 200);

      // Admin cancelling match
      const cancelRes = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: admin.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });
      assert.notEqual(cancelRes.status, 403);
      assert.equal(cancelRes.status, 200);
    });
  });

  // ==========================================
  // 6. SPOOFING & CLIENT-SUPPLIED CLAIMS DEFENSE
  // ==========================================
  describe('10. Client-Supplied Claims and Header Spoofing Defense', () => {
    it('10. should ignore client-supplied role in headers, body, or query and enforce database truth', async () => {
      // User is verified in database as Spectator
      const spectator = createRoleUser('Spectator');
      mockUserById(spectator.userDoc);

      // Attacker attempts to spoof Admin role in header, body, and query string
      const res = await fetch(`${baseUrl}/teams?role=Admin`, {
        method: 'POST',
        headers: {
          ...spectator.authHeaders,
          'x-role': 'Admin',
          'x-user-role': 'Admin'
        },
        body: JSON.stringify({
          name: 'Hacked FC',
          role: 'Admin',
          userRole: 'Admin'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /Role "Spectator" is not authorized/i);
    });
  });
});
