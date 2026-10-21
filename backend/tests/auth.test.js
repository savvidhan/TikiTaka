import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import express from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { Player, Team, Match, User } from '../src/models/index.js';
import { verifyToken, generateToken, getJwtSecret, COOKIE_NAME } from '../src/utils/jwt.js';

describe('TikiTaka Authentication REST API Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Start Express app on an ephemeral port for isolated testing
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api/auth`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  /**
   * Helper to create a query mock that is both thenable and supports .select()
   */
  const createQueryMock = (result) => ({
    select: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    catch: (reject) => Promise.resolve(result).catch(reject)
  });

  beforeEach(() => {
    mock.method(User, 'findOne', () => createQueryMock(null));
  });

  afterEach(() => {
    mock.restoreAll();
  });

  /**
   * Helper to mock User.prototype.save while invoking Mongoose schema pre-save hooks
   * so bcrypt hashing runs realistically without requiring a live MongoDB connection.
   */
  const setupMockSave = () => {
    mock.method(User.prototype, 'save', async function () {
      await new Promise((resolve, reject) => {
        User.schema.s.hooks.execPre('save', this, (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      return this;
    });
  };

  /**
   * Helper to construct a mock User document with pre-hashed password
   */
  const createFakeUser = async ({
    id = new mongoose.Types.ObjectId(),
    name = 'Alex Ferguson',
    email = 'alex.ferguson@manutd.com',
    rawPassword = 'ManagerPassword2026!',
    role = 'TeamManager',
    isActive = true
  } = {}) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(rawPassword, salt);

    return new User({
      _id: id,
      name,
      email,
      password: hashedPassword,
      role,
      isActive
    });
  };

  // ==========================================
  // 1. REGISTRATION TESTS (PRESERVED STEP B)
  // ==========================================
  describe('Successful Registration Flows', () => {
    it('should register a new user with default Spectator role when role is omitted', async () => {
      setupMockSave();

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Spectator',
          email: 'jane.spectator@example.com',
          password: 'SecurePassword123!'
        })
      });

      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.message, 'User registered successfully');
      assert.ok(body.data);
      assert.equal(body.data.name, 'Jane Spectator');
      assert.equal(body.data.email, 'jane.spectator@example.com');
      assert.equal(body.data.role, 'Spectator');
      assert.ok(body.data._id);
      assert.equal(body.data.password, undefined);
    });

    it('should register a user with self-assigned TeamManager role', async () => {
      setupMockSave();

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Coach Carter',
          email: 'coach.carter@richmond.com',
          password: 'CoachPassword2026',
          role: 'TeamManager'
        })
      });

      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.role, 'TeamManager');
      assert.equal(body.data.email, 'coach.carter@richmond.com');
    });

    it('should register a user with self-assigned Spectator role', async () => {
      setupMockSave();

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Fan Club Member',
          email: 'fan@example.com',
          password: 'FanPassword123',
          role: 'Spectator'
        })
      });

      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.success, true);
      assert.equal(body.data.role, 'Spectator');
    });

    it('should trim name and normalize email to lowercase', async () => {
      setupMockSave();

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '   Peyton Manning   ',
          email: '  PEYTON.MANNING@Colts.COM  ',
          password: 'SuperBowlChamp18'
        })
      });

      const body = await res.json();

      assert.equal(res.status, 201);
      assert.equal(body.data.name, 'Peyton Manning');
      assert.equal(body.data.email, 'peyton.manning@colts.com');
    });
  });

  describe('Input Validation & Required Fields (Registration)', () => {
    it('should reject request missing name', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'ValidPassword123'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Name is required/);
    });

    it('should reject name shorter than 2 characters', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ' A ',
          email: 'test@example.com',
          password: 'ValidPassword123'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /between 2 and 100 characters/);
    });

    it('should reject request missing email', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          password: 'ValidPassword123'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Email address is required/);
    });

    it('should reject request missing password', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Password is required/);
    });
  });

  describe('Malformed Email Validation (Registration)', () => {
    const invalidEmails = [
      'plainaddress',
      '@missingusername.com',
      'username@.com',
      'username@domain',
      'user name@domain.com',
      'user@domain..com'
    ];

    for (const email of invalidEmails) {
      it(`should reject invalid email format: "${email}"`, async () => {
        const res = await fetch(`${baseUrl}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Test User',
            email,
            password: 'ValidPassword123'
          })
        });

        const body = await res.json();
        assert.equal(res.status, 400);
        assert.equal(body.success, false);
        assert.match(body.message, /valid email address/);
      });
    }
  });

  describe('Password Complexity Requirements (Registration)', () => {
    it('should reject password shorter than 8 characters', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Pass1'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /at least 8 characters/);
    });

    it('should reject password with letters only (missing digits or special characters)', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'OnlyLettersPassword'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /at least one letter and at least one number or special character/);
    });

    it('should reject password with numbers and symbols only (missing letters)', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: '123456789!@#$'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /at least one letter and at least one number or special character/);
    });

    it('should reject password exceeding 128 characters', async () => {
      const longPassword = 'A1' + 'a'.repeat(130);
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: longPassword
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /cannot exceed 128 characters/);
    });
  });

  describe('Role Guardrails & Authorization Enforcement (Registration)', () => {
    it('should reject attempt to self-register as Admin', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Malicious Attacker',
          email: 'admin.wannabe@example.com',
          password: 'AdminPassword123!',
          role: 'Admin'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Registration as Admin is not permitted/);
    });

    it('should reject attempt to self-register as Referee', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Referee Attacker',
          email: 'referee.wannabe@example.com',
          password: 'RefPassword123!',
          role: 'Referee'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Registration as Referee is not permitted/);
    });

    it('should reject attempt to register with non-existent role', async () => {
      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Unknown Role User',
          email: 'unknown@example.com',
          password: 'ValidPassword123!',
          role: 'SuperPresident'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid role/);
    });
  });

  describe('Duplicate Email & Concurrency Handling (Registration)', () => {
    it('should return 409 Conflict when email address is already registered', async () => {
      mock.method(User, 'findOne', () =>
        createQueryMock({
          _id: new mongoose.Types.ObjectId(),
          email: 'existing.user@example.com'
        })
      );

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Attempt',
          email: 'existing.user@example.com',
          password: 'ValidPassword123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 409);
      assert.equal(body.success, false);
      assert.match(body.message, /already exists/);
    });

    it('should handle MongoDB duplicate key error (code 11000) during concurrent save', async () => {
      mock.method(User.prototype, 'save', async function () {
        const duplicateError = new Error('E11000 duplicate key error collection: users index: email_1 dup key');
        duplicateError.code = 11000;
        throw duplicateError;
      });

      const res = await fetch(`${baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Concurrent User',
          email: 'concurrent@example.com',
          password: 'ValidPassword123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 409);
      assert.equal(body.success, false);
      assert.match(body.message, /already exists/);
    });
  });

  // ==========================================
  // 2. LOGIN & SESSION TESTS (STEP C)
  // ==========================================
  describe('Successful Login Flows', () => {
    it('should authenticate user with valid credentials, issue JWT, and set HTTP-only cookie', async () => {
      const fakeUser = await createFakeUser({
        name: 'Alex Ferguson',
        email: 'alex.ferguson@manutd.com',
        rawPassword: 'ManagerPassword2026!',
        role: 'TeamManager'
      });

      mock.method(User, 'findOne', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alex.ferguson@manutd.com',
          password: 'ManagerPassword2026!'
        })
      });

      const body = await res.json();

      // 1. Status & JSON payload checks
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, 'Login successful');
      assert.ok(body.token, 'Response must include JWT token for API clients');
      assert.ok(body.data);
      assert.equal(body.data.name, 'Alex Ferguson');
      assert.equal(body.data.email, 'alex.ferguson@manutd.com');
      assert.equal(body.data.role, 'TeamManager');
      assert.equal(body.data.password, undefined);

      // 2. Cookie header inspection
      const cookieHeader = res.headers.get('set-cookie');
      assert.ok(cookieHeader, 'Response must include Set-Cookie header');
      assert.match(cookieHeader, new RegExp(`${COOKIE_NAME}=`));
      assert.match(cookieHeader, /HttpOnly/i, 'Cookie must have HttpOnly flag');
      assert.match(cookieHeader, /SameSite=Lax/i, 'Cookie must default to SameSite=Lax');
      assert.match(cookieHeader, /Path=\//i, 'Cookie path must be root');

      // 3. JWT token verification
      const decoded = verifyToken(body.token);
      assert.equal(decoded.id, fakeUser._id.toString());
      assert.equal(decoded.role, 'TeamManager');
      assert.equal(decoded.password, undefined);
    });

    it('should normalize email to lowercase and trim whitespace before authentication', async () => {
      const fakeUser = await createFakeUser({
        email: 'coach.carter@richmond.com',
        rawPassword: 'CoachPassword2026',
        role: 'TeamManager'
      });

      mock.method(User, 'findOne', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '   COACH.CARTER@Richmond.COM   ',
          password: 'CoachPassword2026'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.data.email, 'coach.carter@richmond.com');
    });

    it('should authenticate Spectator user and encode Spectator role claim', async () => {
      const fakeUser = await createFakeUser({
        name: 'Fan Club Member',
        email: 'fan@example.com',
        rawPassword: 'FanPassword123!',
        role: 'Spectator'
      });

      mock.method(User, 'findOne', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'fan@example.com',
          password: 'FanPassword123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.data.role, 'Spectator');

      const decoded = verifyToken(body.token);
      assert.equal(decoded.role, 'Spectator');
    });
  });

  describe('Authentication Failure & Generic Error Handling', () => {
    it('should return generic 401 when email does not exist in database', async () => {
      // User.findOne returns null
      mock.method(User, 'findOne', () => createQueryMock(null));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
      assert.equal(body.token, undefined);
      assert.equal(res.headers.get('set-cookie'), null);
    });

    it('should return generic 401 when password does not match', async () => {
      const fakeUser = await createFakeUser({
        rawPassword: 'CorrectPassword123!'
      });

      mock.method(User, 'findOne', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alex.ferguson@manutd.com',
          password: 'WrongPassword999!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.message, 'Invalid email or password');
      assert.equal(body.token, undefined);
      assert.equal(res.headers.get('set-cookie'), null);
    });

    it('should mitigate account enumeration by returning identical error responses for nonexistent email vs wrong password', async () => {
      // 1. Nonexistent email response
      mock.method(User, 'findOne', () => createQueryMock(null));
      const resNonExistent = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'no.such.user@example.com',
          password: 'AnyPassword123!'
        })
      });
      const bodyNonExistent = await resNonExistent.json();

      // 2. Wrong password response
      const fakeUser = await createFakeUser({ rawPassword: 'ActualPassword123!' });
      mock.method(User, 'findOne', () => createQueryMock(fakeUser));
      const resWrongPass = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alex.ferguson@manutd.com',
          password: 'IncorrectPassword123!'
        })
      });
      const bodyWrongPass = await resWrongPass.json();

      assert.equal(resNonExistent.status, resWrongPass.status);
      assert.equal(bodyNonExistent.message, bodyWrongPass.message);
      assert.equal(bodyNonExistent.message, 'Invalid email or password');
    });
  });

  describe('Account Status & Inactive Accounts', () => {
    it('should reject login for deactivated user with 403 Forbidden', async () => {
      const inactiveUser = await createFakeUser({
        name: 'Deactivated User',
        email: 'deactivated@example.com',
        rawPassword: 'Password123!',
        isActive: false
      });

      mock.method(User, 'findOne', () => createQueryMock(inactiveUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'deactivated@example.com',
          password: 'Password123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /deactivated/i);
      assert.equal(body.token, undefined);
      assert.equal(res.headers.get('set-cookie'), null);
    });
  });

  describe('Missing & Malformed Login Input', () => {
    it('should return 400 when email is omitted', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: 'Password123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Email address is required/);
    });

    it('should return 400 when password is omitted', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'user@example.com'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Password is required/);
    });

    it('should return 400 when email is blank whitespace', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '   ',
          password: 'Password123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 400);
      assert.equal(body.success, false);
      assert.match(body.message, /Email address is required/);
    });
  });

  describe('JWT Token Signature & Security Claims', () => {
    it('should generate valid JWT that contains only id and role and rejects tampering', async () => {
      const fakeUser = await createFakeUser({
        name: 'Claim Test User',
        email: 'claim@example.com',
        rawPassword: 'Password123!',
        role: 'TeamManager'
      });

      mock.method(User, 'findOne', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'claim@example.com',
          password: 'Password123!'
        })
      });

      const body = await res.json();
      const token = body.token;

      // 1. Valid verification
      const payload = verifyToken(token);
      assert.equal(payload.id, fakeUser._id.toString());
      assert.equal(payload.role, 'TeamManager');
      assert.ok(payload.exp, 'Token must contain exp timestamp');
      assert.ok(payload.iat, 'Token must contain iat timestamp');
      assert.ok(payload.exp > payload.iat, 'Expiry must be in the future');

      // 2. Verify no sensitive fields in payload
      assert.equal(payload.password, undefined);
      assert.equal(payload.email, undefined);

      // 3. Rejection of tampered token
      const tamperedToken = token.slice(0, -6) + 'abcdef';
      assert.throws(() => verifyToken(tamperedToken), /invalid signature/i);
    });
  });

  describe('Cookie Security Attributes & Expiration', () => {
    it('should set cookie with HttpOnly, SameSite, and valid Max-Age', async () => {
      const fakeUser = await createFakeUser({
        email: 'cookie.test@example.com',
        rawPassword: 'Password123!'
      });

      mock.method(User, 'findOne', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'cookie.test@example.com',
          password: 'Password123!'
        })
      });

      const setCookie = res.headers.get('set-cookie');
      assert.ok(setCookie);
      assert.match(setCookie, /tikitaka_token=/);
      assert.match(setCookie, /HttpOnly/i);
      assert.match(setCookie, /Path=\//);
      assert.match(setCookie, /SameSite=Lax/i);
      assert.match(setCookie, /Max-Age=604800/i); // 7 days in seconds
    });
  });

  describe('Credentialed CORS on Auth Endpoints', () => {
    it('should permit credentialed CORS requests from approved origins with proper headers', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      assert.equal(res.status, 204);
      assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
      assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
      assert.notEqual(res.headers.get('access-control-allow-origin'), '*');
    });

    it('should safely reject unapproved cross-origin requests without allowing credentials', async () => {
      const res = await fetch(`${baseUrl}/login`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil-phishing-site.com',
          'Access-Control-Request-Method': 'POST'
        }
      });

      // Unapproved origin receives no allow-origin header
      assert.equal(res.headers.get('access-control-allow-origin'), null);
    });
  });

  describe('Login Rate Limiting', () => {
    it('should return 429 when login rate limit is exceeded', async () => {
      const testApp = express();
      testApp.use(express.json());

      const strictLimiter = rateLimit({
        windowMs: 5000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          message: 'Too many login attempts from this IP, please try again after 15 minutes'
        }
      });

      testApp.post('/api/auth/login', strictLimiter, (req, res) => {
        res.json({ success: true });
      });

      const testServer = await new Promise((resolve) => {
        const s = testApp.listen(0, () => resolve(s));
      });
      const port = testServer.address().port;

      try {
        // Request 1: OK
        const res1 = await fetch(`http://localhost:${port}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'pass' })
        });
        assert.equal(res1.status, 200);

        // Request 2: OK
        const res2 = await fetch(`http://localhost:${port}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'pass' })
        });
        assert.equal(res2.status, 200);

        // Request 3: Blocked (429)
        const res3 = await fetch(`http://localhost:${port}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'pass' })
        });
        const body3 = await res3.json();

        assert.equal(res3.status, 429);
        assert.equal(body3.success, false);
        assert.match(body3.message, /Too many login attempts/);
      } finally {
        await new Promise((resolve) => testServer.close(resolve));
      }
    });
  });

  describe('Password Hash Protection Across Endpoints', () => {
    it('should never expose password or hash in response payload across registration and login', async () => {
      const fakeUser = await createFakeUser({
        name: 'Password Safety User',
        email: 'pass.safety@example.com',
        rawPassword: 'SecretPassword123!'
      });

      mock.method(User, 'findOne', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'pass.safety@example.com',
          password: 'SecretPassword123!'
        })
      });

      const body = await res.json();
      assert.equal(res.status, 200);
      assert.equal(body.password, undefined);
      assert.equal(body.data.password, undefined);
      assert.equal(body.hash, undefined);
      assert.equal(body.data.hash, undefined);
    });
  });

  // ==========================================
  // 3. AUTHENTICATION MIDDLEWARE (PROTECT) TESTS (STEP D)
  // ==========================================
  describe('Authentication Middleware (protect)', () => {
    it('should reject request without credentials on protected mutation with 401', async () => {
      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Unauthorized FC' })
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /Authentication required/i);
    });

    it('should reject malformed or tampered Bearer token with 401', async () => {
      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer invalid.token.payload'
        },
        body: JSON.stringify({ name: 'Tampered FC' })
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /Invalid or malformed/i);
    });

    it('should reject expired JWT token with 401', async () => {
      const expiredToken = jwt.sign(
        { id: new mongoose.Types.ObjectId().toString(), role: 'Spectator' },
        getJwtSecret(),
        { expiresIn: '-5s' }
      );

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${expiredToken}`
        },
        body: JSON.stringify({ name: 'Expired FC' })
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /token has expired/i);
    });

    it('should authenticate successfully with valid HTTP-only cookie', async () => {
      const fakeUser = await createFakeUser({
        name: 'Cookie User',
        email: 'cookie.user@example.com',
        role: 'TeamManager'
      });

      const validToken = generateToken(fakeUser);
      mock.method(User, 'findById', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${COOKIE_NAME}=${validToken}`
        },
        body: JSON.stringify({}) // Empty body causes 400 validation error in controller, proving auth passed!
      });

      // Status should be 400 (validation failure from controller) and NOT 401 (auth failure)
      assert.notEqual(res.status, 401);
      assert.equal(res.status, 400);
    });

    it('should authenticate successfully with valid Bearer token', async () => {
      const fakeUser = await createFakeUser({
        name: 'Bearer User',
        email: 'bearer.user@example.com',
        role: 'TeamManager'
      });

      const validToken = generateToken(fakeUser);
      mock.method(User, 'findById', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({})
      });

      assert.notEqual(res.status, 401);
      assert.equal(res.status, 400);
    });

    it('should reject token when associated user is deleted/nonexistent in database with 401', async () => {
      const validToken = generateToken({
        _id: new mongoose.Types.ObjectId(),
        role: 'TeamManager'
      });

      // User.findById returns null (user deleted)
      mock.method(User, 'findById', () => createQueryMock(null));

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({ name: 'Ghost FC' })
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /no longer exists/i);
    });

    it('should reject token for deactivated/inactive user with 403 Forbidden', async () => {
      const deactivatedUser = await createFakeUser({
        name: 'Banned Manager',
        email: 'banned@example.com',
        role: 'TeamManager',
        isActive: false
      });

      const validToken = generateToken(deactivatedUser);
      mock.method(User, 'findById', () => createQueryMock(deactivatedUser));

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${validToken}`
        },
        body: JSON.stringify({ name: 'Banned FC' })
      });

      const body = await res.json();
      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.match(body.message, /deactivated/i);
    });

    it('should reject conflicting cookie and Bearer credentials with 401', async () => {
      const userA = await createFakeUser({ name: 'User A', email: 'a@example.com' });
      const userB = await createFakeUser({ name: 'User B', email: 'b@example.com' });

      const cookieToken = generateToken(userA);
      const bearerToken = generateToken(userB);

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${COOKIE_NAME}=${cookieToken}`,
          Authorization: `Bearer ${bearerToken}`
        },
        body: JSON.stringify({ name: 'Conflict FC' })
      });

      const body = await res.json();
      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.match(body.message, /Authentication conflict/i);
    });

    it('should accept matching cookie and Bearer credentials when both identify the same user', async () => {
      const fakeUser = await createFakeUser({ name: 'Same User', email: 'same@example.com' });
      const token = generateToken(fakeUser);

      mock.method(User, 'findById', () => createQueryMock(fakeUser));

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${COOKIE_NAME}=${token}`,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });

      assert.notEqual(res.status, 401);
    });

    it('should derive req.user from verified database user and ignore client-supplied role or ID', async () => {
      const verifiedDbUser = await createFakeUser({
        name: 'Database Truth',
        email: 'truth@example.com',
        role: 'Spectator'
      });

      const token = generateToken(verifiedDbUser);
      mock.method(User, 'findById', () => createQueryMock(verifiedDbUser));

      // Test against a dedicated micro-app mounting protect
      const testApp = express();
      testApp.use(express.json());
      const { protect } = await import('../src/middleware/auth.js');
      testApp.get('/test-user', protect, (req, res) => {
        res.json({ user: req.user });
      });

      const testServer = await new Promise((resolve) => {
        const s = testApp.listen(0, () => resolve(s));
      });
      const port = testServer.address().port;

      try {
        const res = await fetch(`http://localhost:${port}/test-user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            // Attacker attempts to spoof admin role in header
            'x-role': 'Admin'
          }
        });

        const body = await res.json();
        assert.equal(res.status, 200);
        assert.equal(body.user.role, 'Spectator'); // Truth from DB, not spoofed
        assert.equal(body.user.email, 'truth@example.com');
        assert.equal(body.user.password, undefined); // Password never attached
      } finally {
        await new Promise((resolve) => testServer.close(resolve));
      }
    });
  });

  // ==========================================
  // 4. PUBLIC READS & PROTECTED MUTATIONS
  // ==========================================
  describe('Public Read Endpoints & Unauthenticated Mutation Protection', () => {
    it('should permit unauthenticated access to GET /api/teams', async () => {
      mock.method(Team, 'find', () => ({
        populate: () => ({
          sort: () => ({
            lean: async () => []
          })
        })
      }));

      const res = await fetch(`${baseUrl.replace('/auth', '/teams')}`);
      assert.equal(res.status, 200);
    });

    it('should permit unauthenticated access to GET /api/players', async () => {
      mock.method(Player, 'find', () => ({
        sort: () => ({
          lean: async () => []
        })
      }));

      const res = await fetch(`${baseUrl.replace('/auth', '/players')}`);
      assert.equal(res.status, 200);
    });

    it('should permit unauthenticated access to GET /api/matches', async () => {
      mock.method(Match, 'countDocuments', async () => 0);
      mock.method(Match, 'find', () => ({
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
      }));

      const res = await fetch(`${baseUrl.replace('/auth', '/matches')}`);
      assert.equal(res.status, 200);
    });

    it('should reject unauthenticated POST /api/players with 401', async () => {
      const res = await fetch(`${baseUrl.replace('/auth', '/players')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Unauth' })
      });
      assert.equal(res.status, 401);
    });

    it('should reject unauthenticated POST /api/matches with 401', async () => {
      const res = await fetch(`${baseUrl.replace('/auth', '/matches')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Unauth Match' })
      });
      assert.equal(res.status, 401);
    });

    it('should reject unauthenticated DELETE /api/matches/:id with 401', async () => {
      const res = await fetch(`${baseUrl.replace('/auth', '/matches')}/${new mongoose.Types.ObjectId()}`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 401);
    });
  });

  describe('Session Management Endpoints (GET /api/auth/me & POST /api/auth/logout)', () => {
    it('should reject unauthenticated GET /api/auth/me with 401', async () => {
      const res = await fetch(`${baseUrl}/me`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.match(data.message, /authentication required/i);
    });

    it('should return safe user profile for authenticated user via Bearer token', async () => {
      const userId = new mongoose.Types.ObjectId();
      const userDoc = {
        _id: userId,
        name: 'Session User',
        email: 'session@tikitaka.test',
        role: 'TeamManager',
        isActive: true
      };

      mock.method(User, 'findById', () => createQueryMock(userDoc));

      const token = generateToken(userDoc);
      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data._id, userId.toString());
      assert.equal(body.data.name, 'Session User');
      assert.equal(body.data.email, 'session@tikitaka.test');
      assert.equal(body.data.role, 'TeamManager');
      assert.equal(body.data.isActive, true);
      assert.equal(body.data.password, undefined);
    });

    it('should return safe user profile for authenticated user via cookie', async () => {
      const userId = new mongoose.Types.ObjectId();
      const userDoc = {
        _id: userId,
        name: 'Cookie User',
        email: 'cookie@tikitaka.test',
        role: 'Spectator',
        isActive: true
      };

      mock.method(User, 'findById', () => createQueryMock(userDoc));

      const token = generateToken(userDoc);
      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Cookie: `${COOKIE_NAME}=${token}`
        }
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.equal(body.data.name, 'Cookie User');
      assert.equal(body.data.role, 'Spectator');
    });

    it('should reject deactivated user calling GET /api/auth/me with 403', async () => {
      const userId = new mongoose.Types.ObjectId();
      const userDoc = {
        _id: userId,
        name: 'Inactive User',
        email: 'inactive@tikitaka.test',
        role: 'Spectator',
        isActive: false
      };

      mock.method(User, 'findById', () => createQueryMock(userDoc));

      const token = generateToken(userDoc);
      const res = await fetch(`${baseUrl}/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.message, /account has been deactivated/i);
    });

    it('should clear session cookie upon POST /api/auth/logout', async () => {
      const res = await fetch(`${baseUrl}/logout`, {
        method: 'POST'
      });

      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.success, true);
      assert.match(body.message, /logged out successfully/i);

      // Verify Set-Cookie header clears the cookie
      const setCookieHeader = res.headers.get('set-cookie');
      assert.ok(setCookieHeader);
      assert.match(setCookieHeader, new RegExp(`${COOKIE_NAME}=`));
      assert.match(setCookieHeader, /(Expires=Thu, 01 Jan 1970|Max-Age=0)/i);
    });
  });
});

