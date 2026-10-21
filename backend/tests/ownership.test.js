import { describe, it, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { User, Match, Team, Player } from '../src/models/index.js';
import { generateToken } from '../src/utils/jwt.js';

describe('TikiTaka Resource Ownership and Match Assignment Enforcement (Step F)', () => {
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

  const mockUserById = (userDoc) => {
    mock.method(User, 'findById', () => ({
      select: () => Promise.resolve(userDoc),
      then: (resolve, reject) => Promise.resolve(userDoc).then(resolve, reject),
      catch: (reject) => Promise.resolve(userDoc).catch(reject)
    }));
  };

  const createRoleUser = (role, customId = null) => {
    const id = customId || new mongoose.Types.ObjectId();
    const userDoc = {
      _id: id,
      name: `${role} User`,
      email: `${role.toLowerCase()}-${id.toString().slice(-4)}@tikitaka.test`,
      role,
      isActive: true
    };
    const token = generateToken(userDoc);
    return {
      id,
      userDoc,
      token,
      authHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    };
  };

  // ==========================================
  // 1. TEAM OWNERSHIP
  // ==========================================
  describe('Team Ownership Enforcement', () => {
    it('1. TeamManager can create a team and becomes its manager', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      let savedDoc = null;
      mock.method(Team.prototype, 'save', async function () {
        savedDoc = this;
        return this;
      });

      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({ name: 'Manager FC', shortName: 'MFC' })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(savedDoc);
      assert.equal(savedDoc.manager.toString(), manager.id.toString());
    });

    it('2. TeamManager cannot spoof another manager as owner', async () => {
      const manager = createRoleUser('TeamManager');
      const victimManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      let savedDoc = null;
      mock.method(Team.prototype, 'save', async function () {
        savedDoc = this;
        return this;
      });

      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({
          name: 'Spoofed FC',
          manager: victimManagerId,
          managerId: victimManagerId,
          ownerId: victimManagerId
        })
      });

      assert.equal(res.status, 201);
      // The server MUST enforce the authenticated user ID and ignore spoofed ID
      assert.equal(savedDoc.manager.toString(), manager.id.toString());
      assert.notEqual(savedDoc.manager.toString(), victimManagerId.toString());
    });

    it('3. TeamManager can update their own team', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const teamId = new mongoose.Types.ObjectId();
      const mockTeam = {
        _id: teamId,
        name: 'My Team',
        manager: manager.id,
        save: async function () { return this; },
        populate: async function () { return this; }
      };

      mock.method(Team, 'findById', async () => mockTeam);

      const res = await fetch(`${baseUrl}/teams/${teamId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ description: 'Updated by owner' })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(mockTeam.description, 'Updated by owner');
    });

    it('3. TeamManager can delete their own team', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const teamId = new mongoose.Types.ObjectId();
      const mockTeam = {
        _id: teamId,
        name: 'My Team',
        manager: manager.id
      };

      mock.method(Team, 'findById', async () => mockTeam);
      mock.method(Match, 'exists', async () => false);
      let deleted = false;
      mock.method(Team, 'findByIdAndDelete', async () => { deleted = true; return mockTeam; });

      const res = await fetch(`${baseUrl}/teams/${teamId}`, {
        method: 'DELETE',
        headers: manager.authHeaders
      });

      assert.equal(res.status, 200);
      assert.equal(deleted, true);
    });

    it('4. TeamManager cannot update another manager\'s team', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const teamId = new mongoose.Types.ObjectId();
      const mockTeam = {
        _id: teamId,
        name: 'Other Team',
        manager: otherManagerId
      };

      mock.method(Team, 'findById', async () => mockTeam);

      const res = await fetch(`${baseUrl}/teams/${teamId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ name: 'Hacked Name' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*permission to manage this team/i);
    });

    it('4. TeamManager cannot delete another manager\'s team', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const teamId = new mongoose.Types.ObjectId();
      const mockTeam = {
        _id: teamId,
        name: 'Other Team',
        manager: otherManagerId
      };

      mock.method(Team, 'findById', async () => mockTeam);

      const res = await fetch(`${baseUrl}/teams/${teamId}`, {
        method: 'DELETE',
        headers: manager.authHeaders
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*permission to delete this team/i);
    });

    it('5. Legacy team with no manager cannot be claimed or modified by a TeamManager', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const teamId = new mongoose.Types.ObjectId();
      const legacyTeam = {
        _id: teamId,
        name: 'Legacy Unmanaged FC',
        manager: null // No manager assigned
      };

      mock.method(Team, 'findById', async () => legacyTeam);

      const res = await fetch(`${baseUrl}/teams/${teamId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ description: 'Attempting to claim legacy team' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*permission to manage this team/i);
    });

    it('6. Admin can manage another user\'s team', async () => {
      const admin = createRoleUser('Admin');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(admin.userDoc);

      const teamId = new mongoose.Types.ObjectId();
      const mockTeam = {
        _id: teamId,
        name: 'User FC',
        manager: otherManagerId,
        save: async function () { return this; },
        populate: async function () { return this; }
      };

      mock.method(Team, 'findById', async () => mockTeam);

      const res = await fetch(`${baseUrl}/teams/${teamId}`, {
        method: 'PATCH',
        headers: admin.authHeaders,
        body: JSON.stringify({ description: 'Admin updated description' })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(mockTeam.description, 'Admin updated description');
    });
  });

  // ==========================================
  // 2. PLAYER OWNERSHIP
  // ==========================================
  describe('Player Ownership Enforcement', () => {
    it('7. TeamManager can create a player for their own team', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const teamId = new mongoose.Types.ObjectId();
      const managerTeam = {
        _id: teamId,
        name: 'Manager Squad',
        manager: manager.id,
        roster: [],
        save: async function () { return this; }
      };

      mock.method(Team, 'findById', async () => managerTeam);

      let savedPlayer = null;
      mock.method(Player.prototype, 'save', async function () {
        savedPlayer = this;
        return this;
      });

      const res = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({
          firstName: 'Erling',
          lastName: 'Haaland',
          team: teamId
        })
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.ok(savedPlayer);
      assert.equal(savedPlayer.team.toString(), teamId.toString());
      assert.equal(managerTeam.roster.length, 1);
    });

    it('8. TeamManager cannot create a player for another manager\'s team', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const otherTeamId = new mongoose.Types.ObjectId();
      const otherTeam = {
        _id: otherTeamId,
        name: 'Rival Squad',
        manager: otherManagerId
      };

      mock.method(Team, 'findById', async () => otherTeam);

      const res = await fetch(`${baseUrl}/players`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({
          firstName: 'Unauthorized',
          lastName: 'Signee',
          team: otherTeamId
        })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*only create player profiles for teams you manage/i);
    });

    it('9. TeamManager cannot edit another team\'s player', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const playerId = new mongoose.Types.ObjectId();
      const mockPlayer = {
        _id: playerId,
        firstName: 'Rival',
        lastName: 'Star',
        team: new mongoose.Types.ObjectId()
      };

      const rivalTeam = {
        _id: mockPlayer.team,
        manager: otherManagerId
      };

      mock.method(Player, 'findById', async () => mockPlayer);
      mock.method(Team, 'find', async () => [rivalTeam]);

      const res = await fetch(`${baseUrl}/players/${playerId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ firstName: 'Poached' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden.*affiliated with a team you do not manage/i);
    });

    it('9. TeamManager cannot transfer a player to a team they do not manage', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const playerId = new mongoose.Types.ObjectId();
      const managerTeamId = new mongoose.Types.ObjectId();
      const mockPlayer = {
        _id: playerId,
        firstName: 'Loyal',
        lastName: 'Player',
        team: managerTeamId,
        save: async function () { return this; }
      };

      const myTeam = { _id: managerTeamId, manager: manager.id };
      const rivalTargetTeamId = new mongoose.Types.ObjectId();
      const rivalTeam = { _id: rivalTargetTeamId, manager: otherManagerId };

      mock.method(Player, 'findById', async () => mockPlayer);
      mock.method(Team, 'find', async () => [myTeam]);
      mock.method(Team, 'findById', async (id) => (id.toString() === rivalTargetTeamId.toString() ? rivalTeam : myTeam));

      const res = await fetch(`${baseUrl}/players/${playerId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ team: rivalTargetTeamId })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Forbidden.*Cannot transfer player to a team you do not manage/i);
    });

    it('10. Legacy or ambiguous player associations do not grant implicit ownership', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const playerId = new mongoose.Types.ObjectId();
      const legacyPlayer = {
        _id: playerId,
        firstName: 'Free',
        lastName: 'Agent',
        team: null
      };

      mock.method(Player, 'findById', async () => legacyPlayer);
      mock.method(Team, 'find', async () => []); // No team associations found

      const res = await fetch(`${baseUrl}/players/${playerId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ firstName: 'AttemptedClaim' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Forbidden.*Only Admins can modify unassociated players/i);
    });

    it('11. Admin retains permitted player-management access', async () => {
      const admin = createRoleUser('Admin');
      mockUserById(admin.userDoc);

      const playerId = new mongoose.Types.ObjectId();
      const mockPlayer = {
        _id: playerId,
        firstName: 'Any',
        lastName: 'Player',
        save: async function () { return this; }
      };

      mock.method(Player, 'findById', async () => mockPlayer);

      const res = await fetch(`${baseUrl}/players/${playerId}`, {
        method: 'PATCH',
        headers: admin.authHeaders,
        body: JSON.stringify({ primaryPosition: 'Forward' })
      });

      assert.equal(res.status, 200);
      assert.equal(mockPlayer.primaryPosition, 'Forward');
    });
  });

  // ==========================================
  // 3. MATCH OWNERSHIP & ASSIGNMENTS
  // ==========================================
  describe('Match Ownership and Referee Assignment', () => {
    it('12. TeamManager cannot schedule on behalf of a team they do not manage', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const myTeam = { _id: new mongoose.Types.ObjectId(), name: 'My Team', manager: manager.id, isActive: true };
      const rivalTeam = { _id: new mongoose.Types.ObjectId(), name: 'Rival Team', manager: otherManagerId, isActive: true };

      mock.method(Team, 'findById', async (id) => (id.toString() === myTeam._id.toString() ? myTeam : rivalTeam));

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({
          title: 'Unauthorized Fixture',
          homeTeam: myTeam._id,
          awayTeam: rivalTeam._id,
          scheduledAt: new Date(Date.now() + 86400000)
        })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Forbidden.*Team managers can only schedule matches between teams they manage/i);
    });

    it('13. createdBy is derived from authenticated user and ignores client claim', async () => {
      const manager = createRoleUser('TeamManager');
      const spoofedUserId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const team1 = { _id: new mongoose.Types.ObjectId(), name: 'Team 1', manager: manager.id, isActive: true };
      const team2 = { _id: new mongoose.Types.ObjectId(), name: 'Team 2', manager: manager.id, isActive: true };

      mock.method(Team, 'findById', async (id) => (id.toString() === team1._id.toString() ? team1 : team2));

      let savedMatch = null;
      mock.method(Match.prototype, 'save', async function () {
        savedMatch = this;
        return this;
      });
      mock.method(Match.prototype, 'populate', async function () {
        return this;
      });

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({
          title: 'Internal Club Derby',
          homeTeam: team1._id,
          awayTeam: team2._id,
          scheduledAt: new Date(Date.now() + 86400000),
          createdBy: spoofedUserId // Attempted spoof
        })
      });

      assert.equal(res.status, 201);
      assert.ok(savedMatch);
      assert.equal(savedMatch.createdBy.toString(), manager.id.toString());
      assert.notEqual(savedMatch.createdBy.toString(), spoofedUserId.toString());
    });

    it('14. TeamManager cannot change team references to bypass ownership checks', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const team1 = { _id: new mongoose.Types.ObjectId(), name: 'My Team 1', manager: manager.id, isActive: true };
      const team2 = { _id: new mongoose.Types.ObjectId(), name: 'My Team 2', manager: manager.id, isActive: true };
      const otherTeam = { _id: new mongoose.Types.ObjectId(), name: 'Other Team', manager: otherManagerId, isActive: true };

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        homeTeam: team1._id,
        awayTeam: team2._id,
        status: 'Scheduled'
      };

      mock.method(Match, 'findById', async () => mockMatch);
      mock.method(Team, 'findById', async (id) => {
        if (id.toString() === team1._id.toString()) return team1;
        if (id.toString() === team2._id.toString()) return team2;
        return otherTeam;
      });

      const res = await fetch(`${baseUrl}/matches/${matchId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ awayTeam: otherTeam._id })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Forbidden.*Cannot assign a team you do not manage/i);
    });

    it('15. Assigned Referee can officiate their match (kickoff & goals)', async () => {
      const referee = createRoleUser('Referee');
      mockUserById(referee.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        status: 'Scheduled',
        referee: referee.id,
        save: async function () { return this; },
        populate: async function () { return this; }
      };

      mock.method(Match, 'findById', async () => mockMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
    });

    it('16. Unassigned Referee cannot officiate another match (returns 403)', async () => {
      const referee = createRoleUser('Referee');
      const otherRefereeId = new mongoose.Types.ObjectId();
      mockUserById(referee.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        status: 'Scheduled',
        referee: otherRefereeId // Different referee assigned!
      };

      mock.method(Match, 'findById', async () => mockMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.equal(body.success, false);
      assert.match(body.message, /Forbidden: You are not the assigned referee for this match/i);
    });

    it('17. Referee cannot spoof assignment through request fields or headers', async () => {
      const referee = createRoleUser('Referee');
      const anotherRefereeId = new mongoose.Types.ObjectId();
      mockUserById(referee.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        status: 'Live',
        referee: anotherRefereeId
      };

      mock.method(Match, 'findById', async () => mockMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: {
          ...referee.authHeaders,
          'x-referee-id': referee.id.toString()
        },
        body: JSON.stringify({
          minute: 15,
          referee: referee.id.toString(),
          assignedReferee: referee.id.toString()
        })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Forbidden: You are not the assigned referee/i);
    });

    it('18. Admin can officiate matches under documented rules', async () => {
      const admin = createRoleUser('Admin');
      mockUserById(admin.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        status: 'Scheduled',
        referee: null, // No referee assigned, Admin can still start
        save: async function () { return this; },
        populate: async function () { return this; }
      };

      mock.method(Match, 'findById', async () => mockMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: admin.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });

      assert.equal(res.status, 200);
      assert.equal(mockMatch.status, 'Live');
    });
  });

  // ==========================================
  // 4. MATCH LIFECYCLE ENFORCEMENT
  // ==========================================
  describe('Match Lifecycle Strict Enforcement', () => {
    it('19. Only valid status transitions succeed (rejects Completed -> Live)', async () => {
      const admin = createRoleUser('Admin');
      mockUserById(admin.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        status: 'Completed'
      };

      mock.method(Match, 'findById', async () => mockMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: admin.authHeaders,
        body: JSON.stringify({ status: 'Live' })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.message, /Invalid status transition/i);
    });

    it('20. Goals are rejected before kickoff and after a match is Completed or Cancelled', async () => {
      const admin = createRoleUser('Admin');
      mockUserById(admin.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const scheduledMatch = { _id: matchId, status: 'Scheduled' };
      mock.method(Match, 'findById', async () => scheduledMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: admin.authHeaders,
        body: JSON.stringify({ minute: 10 })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.message, /Goals can only be recorded when the match is Live/i);
    });

    it('21. TeamManager cannot cancel a Live or Completed match', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const liveMatch = {
        _id: matchId,
        status: 'Live',
        homeTeam: { manager: manager.id },
        awayTeam: { manager: manager.id }
      };

      mock.method(Match, 'findById', async () => liveMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Team managers can only cancel scheduled matches before kickoff/i);
    });

    it('22. Referee cannot cancel matches through the TeamManager cancellation workflow', async () => {
      const referee = createRoleUser('Referee');
      mockUserById(referee.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        status: 'Scheduled',
        referee: referee.id
      };

      mock.method(Match, 'findById', async () => mockMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Only Team Managers and Admins can cancel/i);
    });

    it('23. DELETE cannot bypass ownership, role, or lifecycle restrictions', async () => {
      const manager = createRoleUser('TeamManager');
      const otherManagerId = new mongoose.Types.ObjectId();
      mockUserById(manager.userDoc);

      const matchId = new mongoose.Types.ObjectId();
      const mockMatch = {
        _id: matchId,
        status: 'Scheduled',
        homeTeam: { manager: otherManagerId },
        awayTeam: { manager: otherManagerId }
      };

      mock.method(Match, 'findById', async () => mockMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}`, {
        method: 'DELETE',
        headers: manager.authHeaders
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Forbidden.*permission to delete this match fixture/i);
    });

    it('24. Unauthorized requests leave the database unchanged', async () => {
      const spectator = createRoleUser('Spectator');
      mockUserById(spectator.userDoc);

      let saveCalled = false;
      let deleteCalled = false;
      mock.method(Team.prototype, 'save', async function () { saveCalled = true; return this; });
      mock.method(Team, 'findByIdAndDelete', async () => { deleteCalled = true; });

      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: spectator.authHeaders,
        body: JSON.stringify({ name: 'Spectator Attack' })
      });

      assert.equal(res.status, 403);
      assert.equal(saveCalled, false);
      assert.equal(deleteCalled, false);
    });
  });

  // ==========================================
  // 5. REGRESSION & PUBLIC ACCESS
  // ==========================================
  describe('Regression and Public Endpoints Verification', () => {
    it('25. Public GET endpoints remain accessible without credentials', async () => {
      mock.method(Team, 'find', () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => []
          })
        })
      }));

      mock.method(Player, 'find', () => ({
        sort: () => ({
          lean: async () => []
        })
      }));

      const teamRes = await fetch(`${baseUrl}/teams`);
      assert.equal(teamRes.status, 200);

      const playerRes = await fetch(`${baseUrl}/players`);
      assert.equal(playerRes.status, 200);
    });

    it('26. Registration cannot create Admin or Referee accounts', async () => {
      const adminAttempt = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker Admin',
          email: 'hack-admin@tikitaka.test',
          password: 'Password123!',
          role: 'Admin'
        })
      });

      assert.equal(adminAttempt.status, 400);
      const adminBody = await adminAttempt.json();
      assert.match(adminBody.message, /Registration as Admin is not permitted/i);

      const refAttempt = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker Ref',
          email: 'hack-ref@tikitaka.test',
          password: 'Password123!',
          role: 'Referee'
        })
      });

      assert.equal(refAttempt.status, 400);
      const refBody = await refAttempt.json();
      assert.match(refBody.message, /Registration as Referee is not permitted/i);
    });
  });

  // ==========================================
  // 6. FOCUSED AUDIT VERIFICATION
  // ==========================================
  describe('Audit Focus: Referee Role Validation, Live Cancellation, and Roster Consistency', () => {
    it('should reject Admin assigning a user who is not a Referee', async () => {
      const admin = createRoleUser('Admin');
      const spectatorUser = createRoleUser('Spectator');
      mock.method(User, 'findById', (id) => {
        const doc = (id && id.toString() === spectatorUser.id.toString()) ? spectatorUser.userDoc : admin.userDoc;
        return {
          select: () => Promise.resolve(doc),
          then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
          catch: (reject) => Promise.resolve(doc).catch(reject)
        };
      });

      const team1 = { _id: new mongoose.Types.ObjectId(), name: 'T1', manager: admin.id, isActive: true };
      const team2 = { _id: new mongoose.Types.ObjectId(), name: 'T2', manager: admin.id, isActive: true };
      mock.method(Team, 'findById', async (id) => (id.toString() === team1._id.toString() ? team1 : team2));

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: admin.authHeaders,
        body: JSON.stringify({
          title: 'Invalid Ref Match',
          homeTeam: team1._id,
          awayTeam: team2._id,
          scheduledAt: new Date(Date.now() + 86400000),
          referee: spectatorUser.id
        })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.message, /Only users with the "Referee" role can officiate matches/i);
    });

    it('should reject Admin assigning an inactive Referee', async () => {
      const admin = createRoleUser('Admin');
      const inactiveRef = createRoleUser('Referee');
      inactiveRef.userDoc.isActive = false;

      mock.method(User, 'findById', (id) => {
        const doc = (id && id.toString() === inactiveRef.id.toString()) ? inactiveRef.userDoc : admin.userDoc;
        return {
          select: () => Promise.resolve(doc),
          then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
          catch: (reject) => Promise.resolve(doc).catch(reject)
        };
      });

      const team1 = { _id: new mongoose.Types.ObjectId(), name: 'T1', manager: admin.id, isActive: true };
      const team2 = { _id: new mongoose.Types.ObjectId(), name: 'T2', manager: admin.id, isActive: true };
      mock.method(Team, 'findById', async (id) => (id.toString() === team1._id.toString() ? team1 : team2));

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: admin.authHeaders,
        body: JSON.stringify({
          title: 'Inactive Ref Match',
          homeTeam: team1._id,
          awayTeam: team2._id,
          scheduledAt: new Date(Date.now() + 86400000),
          referee: inactiveRef.id
        })
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.match(body.message, /inactive and cannot be assigned/i);
    });

    it('should ignore referee assignment when submitted by a TeamManager', async () => {
      const manager = createRoleUser('TeamManager');
      const actualRef = createRoleUser('Referee');
      mockUserById(manager.userDoc);

      const team1 = { _id: new mongoose.Types.ObjectId(), name: 'T1', manager: manager.id, isActive: true };
      const team2 = { _id: new mongoose.Types.ObjectId(), name: 'T2', manager: manager.id, isActive: true };
      mock.method(Team, 'findById', async (id) => (id.toString() === team1._id.toString() ? team1 : team2));

      let savedMatch = null;
      mock.method(Match.prototype, 'save', async function () { savedMatch = this; return this; });
      mock.method(Match.prototype, 'populate', async function () { return this; });

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: manager.authHeaders,
        body: JSON.stringify({
          title: 'Manager Match',
          homeTeam: team1._id,
          awayTeam: team2._id,
          scheduledAt: new Date(Date.now() + 86400000),
          referee: actualRef.id // Attempt to self-assign referee
        })
      });

      assert.equal(res.status, 201);
      assert.ok(savedMatch);
      // Non-admin cannot assign referee; must remain null
      assert.equal(savedMatch.referee, null);
    });

    it('should allow Admin to cancel a Live match, but deny TeamManager and Referee', async () => {
      const admin = createRoleUser('Admin');
      const manager = createRoleUser('TeamManager');
      const referee = createRoleUser('Referee');

      const matchId = new mongoose.Types.ObjectId();
      const liveMatch = {
        _id: matchId,
        status: 'Live',
        referee: referee.id,
        homeTeam: { manager: manager.id },
        awayTeam: { manager: manager.id },
        save: async function () { return this; },
        populate: async function () { return this; }
      };

      // 1. Admin CAN cancel a Live match
      mockUserById(admin.userDoc);
      mock.method(Match, 'findById', async () => liveMatch);
      const adminRes = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: admin.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });
      assert.equal(adminRes.status, 200);

      // 2. TeamManager CANNOT cancel a Live match
      mock.restoreAll();
      liveMatch.status = 'Live';
      mockUserById(manager.userDoc);
      mock.method(Match, 'findById', async () => liveMatch);
      const tmRes = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });
      assert.equal(tmRes.status, 403);
      const tmBody = await tmRes.json();
      assert.match(tmBody.message, /only cancel scheduled matches before kickoff/i);

      // 3. Referee CANNOT cancel a Live match
      mock.restoreAll();
      liveMatch.status = 'Live';
      mockUserById(referee.userDoc);
      mock.method(Match, 'findById', async () => liveMatch);
      const refRes = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: referee.authHeaders,
        body: JSON.stringify({ status: 'Cancelled' })
      });
      assert.equal(refRes.status, 403);
      const refBody = await refRes.json();
      assert.match(refBody.message, /not authorized to cancel matches/i);
    });

    it('should synchronize player.team and team rosters upon player transfer', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const playerId = new mongoose.Types.ObjectId();
      const teamAId = new mongoose.Types.ObjectId();
      const teamBId = new mongoose.Types.ObjectId();

      const teamA = {
        _id: teamAId,
        name: 'Team Alpha',
        manager: manager.id,
        roster: [{ player: playerId, role: 'Midfielder' }]
      };
      const teamB = {
        _id: teamBId,
        name: 'Team Beta',
        manager: manager.id,
        roster: [],
        save: async function () { return this; }
      };

      const player = {
        _id: playerId,
        firstName: 'Transfer',
        lastName: 'Star',
        team: teamAId,
        save: async function () { return this; }
      };

      mock.method(Player, 'findById', async () => player);
      mock.method(Team, 'find', async () => [teamA]);
      mock.method(Team, 'findById', async (id) => (id.toString() === teamBId.toString() ? teamB : teamA));

      let pullCalled = false;
      mock.method(Team, 'updateMany', async () => { pullCalled = true; });

      const res = await fetch(`${baseUrl}/players/${playerId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ team: teamBId })
      });

      assert.equal(res.status, 200);
      assert.equal(player.team.toString(), teamBId.toString());
      assert.equal(pullCalled, true);
      assert.equal(teamB.roster.length, 1);
    });

    it('should reject TeamManager attempting to release player to free agency (team: null)', async () => {
      const manager = createRoleUser('TeamManager');
      mockUserById(manager.userDoc);

      const playerId = new mongoose.Types.ObjectId();
      const teamId = new mongoose.Types.ObjectId();
      const myTeam = { _id: teamId, manager: manager.id };
      const player = { _id: playerId, firstName: 'No', lastName: 'FreeAgent', team: teamId };

      mock.method(Player, 'findById', async () => player);
      mock.method(Team, 'find', async () => [myTeam]);

      const res = await fetch(`${baseUrl}/players/${playerId}`, {
        method: 'PATCH',
        headers: manager.authHeaders,
        body: JSON.stringify({ team: null })
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /Only administrators can release players into unassigned\/free-agent status/i);
    });
  });
});
