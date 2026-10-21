import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Player, Team, Match, User } from '../src/models/index.js';
import { generateToken } from '../src/utils/jwt.js';

describe('TikiTaka Team & Player REST API Integration Tests', () => {
  let server;
  let baseUrl;
  let authToken;
  let authHeaders;
  let testUserId;

  before(async () => {
    testUserId = new mongoose.Types.ObjectId();
    authToken = generateToken({ _id: testUserId, role: 'Admin' });
    authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`
    };

    // Start Express app on an ephemeral port (isolated test server)
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

  beforeEach(() => {
    const fakeAuthUser = {
      _id: testUserId,
      name: 'Test Admin',
      email: 'admin@tikitaka.com',
      role: 'Admin',
      isActive: true
    };
    mock.method(User, 'findById', () => ({
      select: () => Promise.resolve(fakeAuthUser),
      then: (resolve, reject) => Promise.resolve(fakeAuthUser).then(resolve, reject),
      catch: (reject) => Promise.resolve(fakeAuthUser).catch(reject)
    }));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // ==========================================
  // OBJECTID VALIDATION TESTS
  // ==========================================
  describe('ObjectId Validation Middleware', () => {
    it('should return 400 when an invalid ObjectId is provided for player', async () => {
      const res = await fetch(`${baseUrl}/players/not-a-valid-id`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid id format/);
    });

    it('should return 400 when an invalid ObjectId is provided for team', async () => {
      const res = await fetch(`${baseUrl}/teams/12345-invalid`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid id format/);
    });
  });

  // ==========================================
  // PLAYER API TESTS
  // ==========================================
  describe('Player Endpoints', () => {
    it('GET /api/players - should list players with count', async () => {
      const fakePlayers = [
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Marcus',
          lastName: 'Rashford',
          displayName: 'Marcus Rashford',
          primaryPosition: 'Forward',
          isActive: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          firstName: 'Kevin',
          lastName: 'De Bruyne',
          displayName: 'Kevin De Bruyne',
          primaryPosition: 'Midfielder',
          isActive: true
        }
      ];

      mock.method(Player, 'find', () => ({
        sort: () => ({
          lean: async () => fakePlayers
        })
      }));

      const res = await fetch(`${baseUrl}/players`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 2);
      assert.equal(body.data[0].displayName, 'Marcus Rashford');
    });

    it('GET /api/players/:id - should return 404 when player is missing', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      mock.method(Player, 'findById', () => ({
        lean: async () => null
      }));

      const res = await fetch(`${baseUrl}/players/${nonExistentId}`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Player not found');
    });

    it('GET /api/players/:id - should return player with club affiliations', async () => {
      const playerId = new mongoose.Types.ObjectId();
      const fakePlayer = {
        _id: playerId,
        firstName: 'Marcus',
        lastName: 'Rashford',
        displayName: 'Marcus Rashford',
        primaryPosition: 'Forward'
      };

      const fakeTeams = [
        { _id: new mongoose.Types.ObjectId(), name: 'Red Hawks FC', shortName: 'RHK' }
      ];

      mock.method(Player, 'findById', () => ({
        lean: async () => fakePlayer
      }));

      mock.method(Team, 'find', () => ({
        lean: async () => fakeTeams
      }));

      const res = await fetch(`${baseUrl}/players/${playerId}`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.displayName, 'Marcus Rashford');
      assert.equal(body.data.teams.length, 1);
      assert.equal(body.data.teams[0].name, 'Red Hawks FC');
    });

    it('POST /api/players - should reject player with missing required fields', async () => {
      const res = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ primaryPosition: 'Forward' })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.ok(body.message);
    });

    it('DELETE /api/players/:id - should safely deactivate player referenced in rosters', async () => {
      const playerId = new mongoose.Types.ObjectId();
      const fakePlayerDoc = {
        _id: playerId,
        displayName: 'Marcus Rashford',
        isActive: true,
        save: async function () {
          this.isActive = false;
          return this;
        }
      };

      mock.method(Player, 'findById', async () => fakePlayerDoc);
      // Player is referenced in a team
      mock.method(Team, 'exists', async () => ({ _id: new mongoose.Types.ObjectId() }));
      mock.method(Match, 'exists', async () => null);

      const res = await fetch(`${baseUrl}/players/${playerId}`, { method: 'DELETE', headers: authHeaders });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.action, 'deactivated');
      assert.match(body.message, /Safely deactivated/);
      assert.equal(body.data.isActive, false);
    });

    it('DELETE /api/players/:id - should delete unreferenced player', async () => {
      const playerId = new mongoose.Types.ObjectId();
      const fakePlayerDoc = {
        _id: playerId,
        displayName: 'Solo Player',
        isActive: true
      };

      mock.method(Player, 'findById', async () => fakePlayerDoc);
      mock.method(Team, 'exists', async () => null);
      mock.method(Match, 'exists', async () => null);
      mock.method(Player, 'findByIdAndDelete', async () => fakePlayerDoc);

      const res = await fetch(`${baseUrl}/players/${playerId}`, { method: 'DELETE', headers: authHeaders });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.action, 'deleted');
      assert.match(body.message, /deleted successfully/);
    });
  });

  // ==========================================
  // TEAM API TESTS
  // ==========================================
  describe('Team Endpoints', () => {
    it('GET /api/teams - should list teams with rosterCount', async () => {
      const fakeTeams = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'Red Hawks FC',
          shortName: 'RHK',
          captain: { displayName: 'Marcus Rashford' },
          roster: [{}, {}, {}],
          isActive: true
        }
      ];

      mock.method(Team, 'find', () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => fakeTeams
          })
        })
      }));

      const res = await fetch(`${baseUrl}/teams`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 1);
      assert.equal(body.data[0].rosterCount, 3);
      assert.equal(body.data[0].name, 'Red Hawks FC');
    });

    it('GET /api/teams/:id - should return 404 when team is missing', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      mock.method(Team, 'findById', () => ({
        populate: () => ({
          populate: () => ({
            lean: async () => null
          })
        })
      }));

      const res = await fetch(`${baseUrl}/teams/${nonExistentId}`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Team not found');
    });

    it('POST /api/teams - should reject team creation when referenced player does not exist', async () => {
      const ghostPlayerId = new mongoose.Types.ObjectId();

      // Mock Player.countDocuments returning 0 (player doesn't exist)
      mock.method(Player, 'countDocuments', async () => 0);
      mock.method(Player, 'find', () => ({
        lean: async () => []
      }));

      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Ghost Squad FC',
          roster: [{ player: ghostPlayerId, jerseyNumber: 10, role: 'Forward' }]
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /does not exist in the database/);
    });

    it('POST /api/teams - should reject duplicate players in team roster', async () => {
      const existingPlayerId = new mongoose.Types.ObjectId();

      // Mock verifyPlayersExist finding the player
      mock.method(Player, 'countDocuments', async () => 1);

      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Duplicate Roster FC',
          roster: [
            { player: existingPlayerId, jerseyNumber: 9, role: 'Forward' },
            { player: existingPlayerId, jerseyNumber: 11, role: 'Forward' }
          ]
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /cannot appear more than once in a team roster/);
    });

    it('POST /api/teams - should reject duplicate jersey numbers in roster', async () => {
      const player1Id = new mongoose.Types.ObjectId();
      const player2Id = new mongoose.Types.ObjectId();

      mock.method(Player, 'countDocuments', async () => 2);

      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Clashing Numbers FC',
          roster: [
            { player: player1Id, jerseyNumber: 10, role: 'Forward' },
            { player: player2Id, jerseyNumber: 10, role: 'Midfielder' }
          ]
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Jersey numbers must be unique within a team/);
    });

    it('POST /api/teams - should reject captain who is not in the roster', async () => {
      const rosterPlayerId = new mongoose.Types.ObjectId();
      const captainPlayerId = new mongoose.Types.ObjectId();

      mock.method(Player, 'countDocuments', async () => 2);

      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          name: 'Outsider Captain FC',
          captain: captainPlayerId,
          roster: [{ player: rosterPlayerId, jerseyNumber: 5, role: 'Defender' }]
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /captain must be a registered member of the roster/);
    });

    it('DELETE /api/teams/:id - should safely deactivate team referenced in matches', async () => {
      const teamId = new mongoose.Types.ObjectId();
      const fakeTeamDoc = {
        _id: teamId,
        name: 'Historic Hawks FC',
        isActive: true,
        save: async function () {
          this.isActive = false;
          return this;
        }
      };

      mock.method(Team, 'findById', async () => fakeTeamDoc);
      // Team has matches
      mock.method(Match, 'exists', async () => ({ _id: new mongoose.Types.ObjectId() }));

      const res = await fetch(`${baseUrl}/teams/${teamId}`, { method: 'DELETE', headers: authHeaders });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.action, 'deactivated');
      assert.match(body.message, /Safely deactivated team/);
      assert.equal(body.data.isActive, false);
    });

    it('DELETE /api/teams/:id - should delete unreferenced team', async () => {
      const teamId = new mongoose.Types.ObjectId();
      const fakeTeamDoc = {
        _id: teamId,
        name: 'Friendly Newbies FC',
        isActive: true
      };

      mock.method(Team, 'findById', async () => fakeTeamDoc);
      mock.method(Match, 'exists', async () => null);
      mock.method(Team, 'findByIdAndDelete', async () => fakeTeamDoc);

      const res = await fetch(`${baseUrl}/teams/${teamId}`, { method: 'DELETE', headers: authHeaders });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.action, 'deleted');
      assert.match(body.message, /deleted successfully/);
    });
  });
});
