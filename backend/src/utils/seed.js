import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, disconnectDatabase } from '../config/database.js';
import Player from '../models/Player.js';
import Team from '../models/Team.js';
import Match from '../models/Match.js';

export const seedDatabase = async () => {
  console.log('🌱 Starting TikiTaka database seeding...');

  const isConnected = await connectDatabase();
  if (!isConnected) {
    console.error('❌ Database connection failed. Aborting seed process.');
    process.exit(1);
  }

  try {
    // ---------------------------------------------------------
    // 1. Seed Players (Deterministic upsert by firstName + lastName)
    // ---------------------------------------------------------
    console.log('⚽ Seeding players...');
    const playerDefinitions = [
      {
        firstName: 'Marcus',
        lastName: 'Rashford',
        displayName: 'Marcus Rashford',
        nationality: 'English',
        primaryPosition: 'Forward',
        preferredFoot: 'Right',
        dateOfBirth: new Date('1997-10-31')
      },
      {
        firstName: 'Virgil',
        lastName: 'van Dijk',
        displayName: 'Virgil van Dijk',
        nationality: 'Dutch',
        primaryPosition: 'Defender',
        preferredFoot: 'Right',
        dateOfBirth: new Date('1991-07-08')
      },
      {
        firstName: 'Alisson',
        lastName: 'Becker',
        displayName: 'Alisson Becker',
        nationality: 'Brazilian',
        primaryPosition: 'Goalkeeper',
        preferredFoot: 'Right',
        dateOfBirth: new Date('1992-10-02')
      },
      {
        firstName: 'Kevin',
        lastName: 'De Bruyne',
        displayName: 'Kevin De Bruyne',
        nationality: 'Belgian',
        primaryPosition: 'Midfielder',
        preferredFoot: 'Right',
        dateOfBirth: new Date('1991-06-28')
      },
      {
        firstName: 'Bukayo',
        lastName: 'Saka',
        displayName: 'Bukayo Saka',
        nationality: 'English',
        primaryPosition: 'Forward',
        preferredFoot: 'Left',
        dateOfBirth: new Date('2001-09-05')
      },
      {
        firstName: 'Declan',
        lastName: 'Rice',
        displayName: 'Declan Rice',
        nationality: 'English',
        primaryPosition: 'Midfielder',
        preferredFoot: 'Right',
        dateOfBirth: new Date('1999-01-14')
      }
    ];

    const players = {};
    for (const p of playerDefinitions) {
      const savedPlayer = await Player.findOneAndUpdate(
        { firstName: p.firstName, lastName: p.lastName },
        { $set: p },
        { upsert: true, new: true, runValidators: true }
      );
      players[`${p.firstName}_${p.lastName}`] = savedPlayer;
      console.log(`   ✓ Player ready: ${savedPlayer.displayName} (${savedPlayer.primaryPosition})`);
    }

    // ---------------------------------------------------------
    // 2. Seed Teams (Deterministic upsert by name)
    // ---------------------------------------------------------
    console.log('\n🛡️ Seeding teams with rosters and captains...');
    const teamDefinitions = [
      {
        name: 'Red Hawks FC',
        shortName: 'RHK',
        homeGround: 'Apex Arena',
        description: 'Premier community football club with aggressive high press and clinical finishing.',
        captain: players['Marcus_Rashford']._id,
        roster: [
          {
            player: players['Marcus_Rashford']._id,
            jerseyNumber: 10,
            role: 'Forward',
            joinedAt: new Date('2024-01-15')
          },
          {
            player: players['Virgil_van Dijk']._id,
            jerseyNumber: 4,
            role: 'Defender',
            joinedAt: new Date('2024-01-15')
          },
          {
            player: players['Alisson_Becker']._id,
            jerseyNumber: 1,
            role: 'Goalkeeper',
            joinedAt: new Date('2024-01-15')
          }
        ]
      },
      {
        name: 'Blue Titans FC',
        shortName: 'BTN',
        homeGround: 'Titan Park Stadium',
        description: 'Possession-oriented football powerhouse with unmatched midfield mastery and tiki-taka build-up.',
        captain: players['Kevin_De Bruyne']._id,
        roster: [
          {
            player: players['Kevin_De Bruyne']._id,
            jerseyNumber: 17,
            role: 'Midfielder',
            joinedAt: new Date('2024-02-01')
          },
          {
            player: players['Bukayo_Saka']._id,
            jerseyNumber: 7,
            role: 'Forward',
            joinedAt: new Date('2024-02-01')
          },
          {
            player: players['Declan_Rice']._id,
            jerseyNumber: 41,
            role: 'Midfielder',
            joinedAt: new Date('2024-02-01')
          }
        ]
      }
    ];

    const teams = {};
    for (const t of teamDefinitions) {
      const savedTeam = await Team.findOneAndUpdate(
        { name: t.name },
        { $set: t },
        { upsert: true, new: true, runValidators: true }
      );
      teams[t.name] = savedTeam;
      console.log(`   ✓ Team ready: ${savedTeam.name} (${savedTeam.shortName}) - ${savedTeam.roster.length} roster players`);
    }

    // ---------------------------------------------------------
    // 3. Seed Matches (One Completed with Goals, One Scheduled)
    // ---------------------------------------------------------
    console.log('\n🏆 Seeding match fixtures and completed scorecard...');
    const matchDefinitions = [
      {
        title: 'Red Hawks FC vs Blue Titans FC - Super Cup Final',
        homeTeam: teams['Red Hawks FC']._id,
        awayTeam: teams['Blue Titans FC']._id,
        venue: 'Apex Arena',
        competitionName: 'Metropolitan Super Cup',
        matchType: 'Tournament',
        durationMinutes: 90,
        status: 'Completed',
        homeScore: 2,
        awayScore: 1,
        scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        startedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 110 * 60 * 1000),
        notes: 'Thrilling final with a late penalty winner from van Dijk.',
        goals: [
          {
            player: players['Marcus_Rashford']._id,
            team: teams['Red Hawks FC']._id,
            minute: 24,
            type: 'OpenPlay'
          },
          {
            player: players['Kevin_De Bruyne']._id,
            team: teams['Blue Titans FC']._id,
            minute: 58,
            type: 'FreeKick'
          },
          {
            player: players['Virgil_van Dijk']._id,
            team: teams['Red Hawks FC']._id,
            minute: 86,
            type: 'Penalty'
          }
        ]
      },
      {
        title: 'Blue Titans FC vs Red Hawks FC - League Matchweek 1',
        homeTeam: teams['Blue Titans FC']._id,
        awayTeam: teams['Red Hawks FC']._id,
        venue: 'Titan Park Stadium',
        competitionName: 'Grassroots Premier League',
        matchType: 'League',
        durationMinutes: 90,
        status: 'Scheduled',
        homeScore: 0,
        awayScore: 0,
        scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        notes: 'High-anticipation reverse fixture under the floodlights.',
        goals: []
      }
    ];

    for (const m of matchDefinitions) {
      const savedMatch = await Match.findOneAndUpdate(
        { title: m.title },
        { $set: m },
        { upsert: true, new: true, runValidators: true }
      );
      console.log(
        `   ✓ Match ready: "${savedMatch.title}" [${savedMatch.status}] - Score: ${savedMatch.homeScore}-${savedMatch.awayScore}`
      );
    }

    console.log('\n✨ Database seeding completed successfully!');
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed with error:', error);
    await disconnectDatabase();
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  seedDatabase();
}
