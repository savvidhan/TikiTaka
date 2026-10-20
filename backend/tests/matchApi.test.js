import { describe, it, before, after, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { Match, Team, Player } from '../src/models/index.js';

describe('TikiTaka Match REST API Integration Tests', () => {
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

  // ==========================================
  // 1. LISTING & FILTERING MATCHES
  // ==========================================
  describe('GET /api/matches', () => {
    it('1. should list matches with pagination and team summaries', async () => {
      const homeId = new mongoose.Types.ObjectId();
      const awayId = new mongoose.Types.ObjectId();
      const fakeMatches = [
        {
          _id: new mongoose.Types.ObjectId(),
          title: 'Season Opener',
          homeTeam: { _id: homeId, name: 'Red Hawks FC', shortName: 'RHK' },
          awayTeam: { _id: awayId, name: 'Blue Titans FC', shortName: 'BTN' },
          status: 'Scheduled',
          scheduledAt: new Date(),
          durationMinutes: 90,
          homeScore: 0,
          awayScore: 0
        }
      ];

      mock.method(Match, 'countDocuments', async () => 1);
      mock.method(Match, 'find', () => ({
        populate: () => ({
          populate: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: async () => fakeMatches
                })
              })
            })
          })
        })
      }));

      const res = await fetch(`${baseUrl}/matches`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 1);
      assert.equal(body.total, 1);
      assert.equal(body.data[0].title, 'Season Opener');
      assert.equal(body.data[0].homeTeam.name, 'Red Hawks FC');
    });

    it('2. should filter matches by status (e.g., Scheduled, Live, Completed)', async () => {
      mock.method(Match, 'countDocuments', async () => 0);
      mock.method(Match, 'find', (filter) => {
        assert.equal(filter.status, 'Live');
        return {
          populate: () => ({
            populate: () => ({
              sort: () => ({
                skip: () => ({
                  limit: () => ({
                    lean: async () => []
                  })
                })
              })
            })
          })
        };
      });

      const res = await fetch(`${baseUrl}/matches?status=Live`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.count, 0);
    });

    it('should reject invalid status query parameter with 400', async () => {
      const res = await fetch(`${baseUrl}/matches?status=InvalidStatus`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid status filter/);
    });
  });

  // ==========================================
  // 2. RETRIEVING A MATCH BY ID & ERROR HANDLING
  // ==========================================
  describe('GET /api/matches/:id', () => {
    it('3. should retrieve a single match with populated teams and goals', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const fakeMatch = {
        _id: matchId,
        title: 'Super Cup Final',
        homeTeam: { name: 'Red Hawks FC', shortName: 'RHK' },
        awayTeam: { name: 'Blue Titans FC', shortName: 'BTN' },
        status: 'Completed',
        homeScore: 2,
        awayScore: 1,
        goals: [
          {
            player: { displayName: 'Marcus Rashford' },
            team: { name: 'Red Hawks FC' },
            minute: 24,
            type: 'OpenPlay'
          }
        ]
      };

      mock.method(Match, 'findById', () => ({
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => ({
                lean: async () => fakeMatch
              })
            })
          })
        })
      }));

      const res = await fetch(`${baseUrl}/matches/${matchId}`);
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.title, 'Super Cup Final');
      assert.equal(body.data.goals.length, 1);
      assert.equal(body.data.goals[0].player.displayName, 'Marcus Rashford');
    });

    it('4. should return 400 for malformed ObjectIds', async () => {
      const res = await fetch(`${baseUrl}/matches/invalid-id-xyz`);
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid id format/);
    });

    it('5. should return 404 for a missing match', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();

      mock.method(Match, 'findById', () => ({
        populate: () => ({
          populate: () => ({
            populate: () => ({
              populate: () => ({
                lean: async () => null
              })
            })
          })
        })
      }));

      const res = await fetch(`${baseUrl}/matches/${nonExistentId}`);
      const body = await res.json();

      assert.equal(res.status, 404);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Match not found');
    });
  });

  // ==========================================
  // 3. FIXTURE CREATION & VALIDATION
  // ==========================================
  describe('POST /api/matches', () => {
    it('6. should reject identical home and away teams with 400', async () => {
      const sameTeamId = new mongoose.Types.ObjectId();

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Self Clash',
          homeTeam: sameTeamId,
          awayTeam: sameTeamId,
          scheduledAt: new Date()
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Home team and away team must be different/);
    });

    it('7. should reject nonexistent team references with 400', async () => {
      const homeTeamId = new mongoose.Types.ObjectId();
      const awayTeamId = new mongoose.Types.ObjectId();

      // Home team exists, away team is null
      mock.method(Team, 'findById', async (id) => {
        if (id.toString() === homeTeamId.toString()) {
          return { _id: homeTeamId, name: 'Home FC', isActive: true };
        }
        return null;
      });

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Ghost Team Match',
          homeTeam: homeTeamId,
          awayTeam: awayTeamId,
          scheduledAt: new Date()
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /away team does not exist/i);
    });

    it('8. should create a valid fixture with clean initial score and Scheduled status', async () => {
      const homeTeamId = new mongoose.Types.ObjectId();
      const awayTeamId = new mongoose.Types.ObjectId();

      mock.method(Team, 'findById', async (id) => {
        if (id.toString() === homeTeamId.toString()) {
          return { _id: homeTeamId, name: 'Hawks', homeGround: 'Hawk Field', isActive: true };
        }
        return { _id: awayTeamId, name: 'Titans', homeGround: 'Titan Ground', isActive: true };
      });

      // Intercept Match.prototype.save to return clean saved object
      mock.method(Match.prototype, 'save', async function () {
        this.populate = async function () { return this; };
        return this;
      });

      const res = await fetch(`${baseUrl}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hawks vs Titans Derby',
          homeTeam: homeTeamId,
          awayTeam: awayTeamId,
          scheduledAt: new Date(Date.now() + 86400000),
          durationMinutes: 90,
          competitionName: 'Grassroots Championship',
          // Client attempts to sneak in scores
          homeScore: 99,
          awayScore: 99,
          status: 'Completed'
        })
      });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.title, 'Hawks vs Titans Derby');
      assert.equal(body.data.status, 'Scheduled'); // Forced to Scheduled
      assert.equal(body.data.homeScore, 0); // Forced to 0
      assert.equal(body.data.awayScore, 0); // Forced to 0
    });
  });

  // ==========================================
  // 4. STATUS TRANSITION RULES
  // ==========================================
  describe('PATCH /api/matches/:id/status', () => {
    it('9. should reject invalid status transitions (e.g. Completed -> Live or Scheduled -> Completed)', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const fakeCompletedMatch = {
        _id: matchId,
        status: 'Completed',
        save: async function () { return this; }
      };

      mock.method(Match, 'findById', async () => fakeCompletedMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Live' })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Cannot transition match from "Completed" to "Live"/);
    });

    it('should transition Scheduled match to Live and set startedAt', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const fakeMatch = {
        _id: matchId,
        status: 'Scheduled',
        save: async function () { return this; },
        populate: async function () { return this; }
      };

      mock.method(Match, 'findById', async () => fakeMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Live' })
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'Live');
      assert.ok(body.data.startedAt);
    });
  });

  // ==========================================
  // 5. GOAL RECORDING & ATOMIC SCORE UPDATES
  // ==========================================
  describe('POST /api/matches/:id/goals', () => {
    it('10. should reject goal recording when match is not Live', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const fakeScheduledMatch = {
        _id: matchId,
        status: 'Scheduled',
        homeTeam: new mongoose.Types.ObjectId(),
        awayTeam: new mongoose.Types.ObjectId()
      };

      mock.method(Match, 'findById', async () => fakeScheduledMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: new mongoose.Types.ObjectId(),
          team: fakeScheduledMatch.homeTeam,
          minute: 10
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Goals can only be recorded when the match is Live/);
    });

    it('13. should reject a goal from a team not participating in the match', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const homeId = new mongoose.Types.ObjectId();
      const awayId = new mongoose.Types.ObjectId();
      const thirdPartyTeamId = new mongoose.Types.ObjectId();

      const fakeLiveMatch = {
        _id: matchId,
        status: 'Live',
        homeTeam: homeId,
        awayTeam: awayId
      };

      mock.method(Match, 'findById', async () => fakeLiveMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: new mongoose.Types.ObjectId(),
          team: thirdPartyTeamId,
          minute: 15
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /either the home team or away team/);
    });

    it('11. should reject a goal scored by a player not belonging to scoring team roster', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const homeId = new mongoose.Types.ObjectId();
      const awayId = new mongoose.Types.ObjectId();
      const playerId = new mongoose.Types.ObjectId();

      const fakeLiveMatch = {
        _id: matchId,
        status: 'Live',
        homeTeam: homeId,
        awayTeam: awayId
      };

      mock.method(Match, 'findById', async () => fakeLiveMatch);
      // Player exists and is active
      mock.method(Player, 'findById', async () => ({ _id: playerId, displayName: 'Mercenary Player', isActive: true }));
      // Player is NOT in home team roster
      mock.method(Team, 'exists', async () => null);

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: playerId,
          team: homeId,
          minute: 25
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /not a registered member of the scoring team roster/);
    });

    it('14. should prevent invalid goal minutes (< 0 or > 130)', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const homeId = new mongoose.Types.ObjectId();
      const awayId = new mongoose.Types.ObjectId();
      const playerId = new mongoose.Types.ObjectId();

      const fakeLiveMatch = {
        _id: matchId,
        status: 'Live',
        homeTeam: homeId,
        awayTeam: awayId
      };

      mock.method(Match, 'findById', async () => fakeLiveMatch);
      mock.method(Player, 'findById', async () => ({ _id: playerId, displayName: 'Valid Player', isActive: true }));
      mock.method(Team, 'exists', async () => ({ _id: homeId }));

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: playerId,
          team: homeId,
          minute: 145 // Exceeds 130
        })
      });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /integer between 0 and 130/);
    });

    it('12. should record a valid goal and atomically update the correct score', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const homeId = new mongoose.Types.ObjectId();
      const awayId = new mongoose.Types.ObjectId();
      const playerId = new mongoose.Types.ObjectId();

      const fakeLiveMatch = {
        _id: matchId,
        status: 'Live',
        homeTeam: homeId,
        awayTeam: awayId,
        startedAt: new Date(Date.now() - 30 * 60000)
      };

      mock.method(Match, 'findById', async () => fakeLiveMatch);
      mock.method(Player, 'findById', async () => ({ _id: playerId, displayName: 'Marcus Rashford', isActive: true }));
      mock.method(Team, 'exists', async () => ({ _id: homeId }));

      const updatedLiveMatch = {
        _id: matchId,
        title: 'Super Cup Derby',
        homeScore: 1,
        awayScore: 0,
        goals: [
          {
            player: { displayName: 'Marcus Rashford' },
            team: { name: 'Red Hawks FC' },
            minute: 30,
            type: 'OpenPlay'
          }
        ]
      };

      mock.method(Match, 'findOneAndUpdate', (filter, update) => {
        // Assert atomic update operators
        assert.equal(filter._id.toString(), matchId.toString());
        assert.equal(filter.status, 'Live');
        assert.ok(update.$push.goals);
        assert.equal(update.$inc.homeScore, 1);

        return {
          populate: () => ({
            populate: () => ({
              populate: () => ({
                populate: async () => updatedLiveMatch
              })
            })
          })
        };
      });

      const res = await fetch(`${baseUrl}/matches/${matchId}/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: playerId,
          team: homeId,
          minute: 30,
          type: 'OpenPlay'
        })
      });
      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.match(body.message, /Goal recorded successfully at minute 30/);
      assert.equal(body.data.homeScore, 1);
      assert.equal(body.data.awayScore, 0);
    });
  });

  // ==========================================
  // 6. HISTORICAL MATCH PRESERVATION
  // ==========================================
  describe('DELETE /api/matches/:id', () => {
    it('15. should reject deletion of completed matches to preserve historical results', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const fakeCompletedMatch = {
        _id: matchId,
        title: 'Historic Final',
        status: 'Completed'
      };

      mock.method(Match, 'findById', async () => fakeCompletedMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}`, { method: 'DELETE' });
      const body = await res.json();

      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Completed matches cannot be deleted/);
    });

    it('should delete a Scheduled match that has not started', async () => {
      const matchId = new mongoose.Types.ObjectId();
      const fakeScheduledMatch = {
        _id: matchId,
        title: 'Friendly Practice',
        status: 'Scheduled'
      };

      mock.method(Match, 'findById', async () => fakeScheduledMatch);
      mock.method(Match, 'findByIdAndDelete', async () => fakeScheduledMatch);

      const res = await fetch(`${baseUrl}/matches/${matchId}`, { method: 'DELETE' });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.action, 'deleted');
      assert.match(body.message, /deleted successfully/);
    });
  });
});
