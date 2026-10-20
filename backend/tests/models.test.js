import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Player from '../src/models/Player.js';
import Team from '../src/models/Team.js';
import Match from '../src/models/Match.js';

describe('Mongoose Models & Schema Validation', () => {
  // ==========================================
  // PLAYER MODEL TESTS
  // ==========================================
  describe('Player Model Validation', () => {
    it('should validate a complete and valid player object', async () => {
      const player = new Player({
        firstName: 'Luka',
        lastName: 'Modric',
        dateOfBirth: new Date('1985-09-09'),
        nationality: 'Croatian',
        primaryPosition: 'Midfielder',
        preferredFoot: 'Both'
      });

      const err = await player.validate();
      assert.equal(err, undefined);
      assert.equal(player.displayName, 'Luka Modric');
    });

    it('should reject player missing required firstName or lastName', async () => {
      const player = new Player({ primaryPosition: 'Forward' });
      await assert.rejects(async () => player.validate(), (err) => {
        assert.ok(err.errors.firstName);
        assert.ok(err.errors.lastName);
        return true;
      });
    });

    it('should reject future date of birth', async () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);
      const player = new Player({
        firstName: 'Future',
        lastName: 'Player',
        dateOfBirth: futureDate
      });

      await assert.rejects(async () => player.validate(), (err) => {
        assert.ok(err.errors.dateOfBirth);
        return true;
      });
    });

    it('should reject invalid primaryPosition or preferredFoot enum', async () => {
      const player = new Player({
        firstName: 'Invalid',
        lastName: 'Enum',
        primaryPosition: 'Quarterback',
        preferredFoot: 'Hands'
      });

      await assert.rejects(async () => player.validate(), (err) => {
        assert.ok(err.errors.primaryPosition);
        assert.ok(err.errors.preferredFoot);
        return true;
      });
    });
  });

  // ==========================================
  // TEAM MODEL TESTS
  // ==========================================
  describe('Team Model Validation', () => {
    it('should validate a valid team with unique roster players and valid captain', async () => {
      const player1Id = new mongoose.Types.ObjectId();
      const player2Id = new mongoose.Types.ObjectId();

      const team = new Team({
        name: 'Arsenal Juniors',
        shortName: 'ARS',
        captain: player1Id,
        roster: [
          { player: player1Id, jerseyNumber: 10, role: 'Forward' },
          { player: player2Id, jerseyNumber: 7, role: 'Midfielder' }
        ]
      });

      const err = await team.validate();
      assert.equal(err, undefined);
    });

    it('should reject duplicate players in the roster', async () => {
      const duplicatePlayerId = new mongoose.Types.ObjectId();

      const team = new Team({
        name: 'Duplicate Players FC',
        roster: [
          { player: duplicatePlayerId, jerseyNumber: 9, role: 'Forward' },
          { player: duplicatePlayerId, jerseyNumber: 11, role: 'Forward' }
        ]
      });

      await assert.rejects(async () => team.validate(), (err) => {
        assert.match(err.message, /cannot appear more than once in a team roster/);
        return true;
      });
    });

    it('should reject duplicate jersey numbers in the roster', async () => {
      const player1Id = new mongoose.Types.ObjectId();
      const player2Id = new mongoose.Types.ObjectId();

      const team = new Team({
        name: 'Duplicate Jerseys FC',
        roster: [
          { player: player1Id, jerseyNumber: 10, role: 'Forward' },
          { player: player2Id, jerseyNumber: 10, role: 'Midfielder' }
        ]
      });

      await assert.rejects(async () => team.validate(), (err) => {
        assert.match(err.message, /Jersey numbers must be unique/);
        return true;
      });
    });

    it('should reject team when captain is not in the roster', async () => {
      const rosterPlayerId = new mongoose.Types.ObjectId();
      const outsiderCaptainId = new mongoose.Types.ObjectId();

      const team = new Team({
        name: 'Outsider Captain FC',
        captain: outsiderCaptainId,
        roster: [{ player: rosterPlayerId, jerseyNumber: 5, role: 'Defender' }]
      });

      await assert.rejects(async () => team.validate(), (err) => {
        assert.match(err.message, /assigned team captain must be a registered member/);
        return true;
      });
    });

    it('should reject out-of-range jersey numbers', async () => {
      const player1Id = new mongoose.Types.ObjectId();

      const team = new Team({
        name: 'Bad Jersey FC',
        roster: [{ player: player1Id, jerseyNumber: 150, role: 'Defender' }]
      });

      await assert.rejects(async () => team.validate(), (err) => {
        assert.ok(err.errors['roster.0.jerseyNumber']);
        return true;
      });
    });
  });

  // ==========================================
  // MATCH MODEL TESTS
  // ==========================================
  describe('Match Model Validation', () => {
    it('should validate a valid scheduled match', async () => {
      const homeTeamId = new mongoose.Types.ObjectId();
      const awayTeamId = new mongoose.Types.ObjectId();

      const match = new Match({
        title: 'Clasico Friendly',
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
        scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
        matchType: 'Friendly',
        status: 'Scheduled',
        homeScore: 0,
        awayScore: 0
      });

      const err = await match.validate();
      assert.equal(err, undefined);
    });

    it('should reject match where homeTeam and awayTeam are identical', async () => {
      const identicalTeamId = new mongoose.Types.ObjectId();

      const match = new Match({
        title: 'Same Team Match',
        homeTeam: identicalTeamId,
        awayTeam: identicalTeamId,
        scheduledAt: new Date()
      });

      await assert.rejects(async () => match.validate(), (err) => {
        assert.match(err.message, /Home team and away team must be different/);
        return true;
      });
    });

    it('should reject negative scores', async () => {
      const homeTeamId = new mongoose.Types.ObjectId();
      const awayTeamId = new mongoose.Types.ObjectId();

      const match = new Match({
        title: 'Negative Score Match',
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
        scheduledAt: new Date(),
        homeScore: -1,
        awayScore: -5
      });

      await assert.rejects(async () => match.validate(), (err) => {
        assert.ok(err.errors.homeScore);
        assert.ok(err.errors.awayScore);
        return true;
      });
    });

    it('should reject invalid match status or match type', async () => {
      const homeTeamId = new mongoose.Types.ObjectId();
      const awayTeamId = new mongoose.Types.ObjectId();

      const match = new Match({
        title: 'Bad Enum Match',
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
        scheduledAt: new Date(),
        status: 'PostponedIndefinitely',
        matchType: 'WorldCupKnockout'
      });

      await assert.rejects(async () => match.validate(), (err) => {
        assert.ok(err.errors.status);
        assert.ok(err.errors.matchType);
        return true;
      });
    });

    it('should reject goal minute out of bounds (> 130)', async () => {
      const homeTeamId = new mongoose.Types.ObjectId();
      const awayTeamId = new mongoose.Types.ObjectId();
      const playerId = new mongoose.Types.ObjectId();

      const match = new Match({
        title: 'Overtime Match',
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
        scheduledAt: new Date(),
        goals: [
          {
            player: playerId,
            team: homeTeamId,
            minute: 145,
            type: 'OpenPlay'
          }
        ]
      });

      await assert.rejects(async () => match.validate(), (err) => {
        assert.ok(err.errors['goals.0.minute']);
        return true;
      });
    });

    it('should reject goal assigned to a team outside of homeTeam or awayTeam', async () => {
      const homeTeamId = new mongoose.Types.ObjectId();
      const awayTeamId = new mongoose.Types.ObjectId();
      const thirdPartyTeamId = new mongoose.Types.ObjectId();
      const playerId = new mongoose.Types.ObjectId();

      const match = new Match({
        title: 'Third Party Goal Match',
        homeTeam: homeTeamId,
        awayTeam: awayTeamId,
        scheduledAt: new Date(),
        goals: [
          {
            player: playerId,
            team: thirdPartyTeamId,
            minute: 12,
            type: 'OpenPlay'
          }
        ]
      });

      await assert.rejects(async () => match.validate(), (err) => {
        assert.match(err.message, /Goal team must be either the designated home team or away team/);
        return true;
      });
    });
  });
});
