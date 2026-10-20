import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app, { getAllowedOrigins } from '../src/app.js';
import Match, { goalTypeEnum } from '../src/models/Match.js';

describe('TikiTaka Deployment Configuration & Pre-Flight Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start Express app on an ephemeral port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ==========================================
  // 1. REVERSE PROXY TRUST CONFIGURATION
  // ==========================================
  describe('Reverse Proxy Configuration', () => {
    it('should configure trust proxy to 1 for single-hop PaaS deployments (Render/Railway)', () => {
      const trustProxyValue = app.get('trust proxy');
      assert.ok(
        trustProxyValue === 1 || trustProxyValue === true || typeof trustProxyValue === 'function',
        `Expected trust proxy to be configured, got ${trustProxyValue}`
      );
    });
  });

  // ==========================================
  // 2. CORS ORIGIN NORMALIZATION & HANDLING
  // ==========================================
  describe('CORS Origin Normalization', () => {
    it('should include localhost defaults in allowed origins', () => {
      const origins = getAllowedOrigins();
      assert.ok(origins.includes('http://localhost:5173'));
      assert.ok(origins.includes('http://127.0.0.1:5173'));
    });

    it('should parse comma-separated origins and strip trailing slashes', () => {
      const originalEnv = process.env.FRONTEND_URL;
      try {
        process.env.FRONTEND_URL = 'https://tikitaka.vercel.app/, https://preview.tikitaka.app///';
        const parsed = getAllowedOrigins();
        assert.ok(parsed.includes('https://tikitaka.vercel.app'));
        assert.ok(parsed.includes('https://preview.tikitaka.app'));
        // Verify no trailing slashes remain
        assert.ok(!parsed.some((o) => o.endsWith('/')));
      } finally {
        process.env.FRONTEND_URL = originalEnv;
      }
    });

    it('should permit requests from approved origins with proper CORS headers', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: {
          Origin: 'http://localhost:5173'
        }
      });

      assert.equal(res.status, 200);
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
    });

    it('should permit requests with no origin (e.g. mobile/server/curl)', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
    });

    it('should safely reject unapproved origins without throwing application errors', async () => {
      const res = await fetch(`${baseUrl}/api/health`, {
        headers: {
          Origin: 'http://malicious-unapproved-site.com'
        }
      });

      // The server should NOT return an application error (500)
      assert.notEqual(res.status, 500);
      // Access-Control-Allow-Origin header must NOT be granted to the unapproved origin
      assert.notEqual(res.headers.get('access-control-allow-origin'), 'http://malicious-unapproved-site.com');
    });
  });

  // ==========================================
  // 3. GOAL TYPE ENUM & ATTRIBUTION VALIDATION
  // ==========================================
  describe('Goal Type Handling & Verification', () => {
    it('should support valid goal types in schema definition', () => {
      assert.ok(goalTypeEnum.includes('OpenPlay'));
      assert.ok(goalTypeEnum.includes('Penalty'));
      assert.ok(goalTypeEnum.includes('FreeKick'));
    });

    it('should reject invalid goal types during validation', () => {
      const invalidGoalMatch = new Match({
        title: 'Validation Match',
        homeTeam: '507f1f77bcf86cd799439011',
        awayTeam: '507f1f77bcf86cd799439012',
        scheduledAt: new Date(),
        goals: [
          {
            team: '507f1f77bcf86cd799439011',
            minute: 10,
            type: 'InvalidGoalType'
          }
        ]
      });

      const err = invalidGoalMatch.validateSync();
      assert.ok(err, 'Expected validation error for invalid goal type');
      assert.ok(
        err.errors['goals.0.type'],
        'Expected validation error specifically on goal type'
      );
    });
  });
});
