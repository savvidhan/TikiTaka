# ⚽ TikiTaka

> Full-stack grassroots football team, player, match scheduling, and live score management web platform with secure role-based access control.

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 + Vite 6
- **Language:** JavaScript (ES Modules, JSX)
- **Styling:** Tailwind CSS v4 (Pitch-inspired dark glassmorphism theme)
- **Routing:** React Router v7 with protected route guards
- **Icons:** Lucide React
- **API Client:** Native `fetch` with `credentials: 'include'` for secure cookie sessions

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js 4 (ES Modules)
- **Database ODM:** Mongoose (v8+) for MongoDB Atlas
- **Authentication:** Stateless JWT signed with HMAC SHA-256 in secure, HTTP-only SameSite cookies
- **Password Security:** `bcryptjs` with 10 salt rounds
- **Protection:** Helmet (HTTP security headers), strict CORS origin validation, CSRF origin verification, and `express-rate-limit` against brute-force login attacks
- **Testing:** Native Node.js test runner (`node:test` & `node:assert`)

### Database
- **Primary Database:** MongoDB Atlas cloud replica set (or local MongoDB)

---

## 📁 Project Directory Structure

```text
tikitaka/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/          # ProtectedRoute, Badge, Modal, States
│   │   │   └── layout/          # AppLayout, Header, Sidebar
│   │   ├── context/             # AuthContext (session, login, logout, user)
│   │   ├── pages/               # Dashboard, Teams, Players, Matches, MatchCenter, Login, Register
│   │   ├── services/            # Centralized API fetch client & health checker
│   │   ├── App.jsx              # Main routing & protected route definitions
│   │   └── main.jsx             # React DOM entry point
│   ├── tests/                   # Frontend validation & guard tests
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json              # Vercel SPA rewrite configuration
│   ├── .env.example
│   └── .env
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # Mongoose connection & state check
│   │   ├── models/              # User, Team, Player, Match schemas
│   │   ├── routes/              # authRoutes, teamRoutes, playerRoutes, matchRoutes
│   │   ├── controllers/         # authController, teamController, playerController, matchController
│   │   ├── middleware/          # auth (protect, authorize), rateLimiter, validateObjectId
│   │   ├── utils/               # jwt (tokens, cookies), seed
│   │   ├── app.js               # Express application configuration & security
│   │   └── server.js            # Server bootstrap & graceful shutdown
│   ├── tests/                   # Comprehensive backend test suites
│   ├── package.json
│   ├── .env.example
│   └── .env
├── render.yaml                  # Render Blueprint deployment configuration
├── .gitignore
├── package.json                 # Monorepo runner scripts
└── README.md
```

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18.0.0 or higher)
- MongoDB instance (MongoDB Atlas free cluster or local MongoDB)

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url>
cd TikiTaka

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment Variables

#### Backend (`backend/.env`):
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tikitaka?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
JWT_SECRET=tikitaka_local_dev_secret_minimum_32_characters_long_12345
JWT_EXPIRES_IN=7d
COOKIE_SAMESITE=lax
```

#### Frontend (`frontend/.env`):
Copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_API_URL=http://localhost:5000/api
```

### 3. Run the Development Servers
You can run both services from the root:
```bash
# Terminal 1: Backend
npm run dev:backend

# Terminal 2: Frontend
npm run dev:frontend
```
- Backend API: `http://localhost:5000`
- API Health Check: `http://localhost:5000/api/health`
- Frontend React App: `http://localhost:5173`

### 4. Run Automated Tests
```bash
# Run backend tests (203 tests across 58 suites)
npm --prefix backend test

# Run frontend tests (20 tests across 6 suites)
npm --prefix frontend test
```

---

## 🌐 Production Deployment Guide

The recommended architecture for TikiTaka is:
- **Frontend:** Vercel (Global Edge CDN, automatic SSL, SPA routing)
- **Backend:** Render (Containerized Node.js Web Service)
- **Database:** MongoDB Atlas (Cloud database replica set)

---

### Step 1: MongoDB Atlas Setup
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create or select a cluster (the free M0 Sandbox tier is sufficient).
3. **Database Access:** Create a database user (e.g. `tikitaka_app`) with **Read and write to any database** privileges. Note the password securely.
4. **Network Access:** In **Network Access**, add an IP entry:
   - For Render cloud deployments with dynamic egress IPs, add `0.0.0.0/0` (Allow Access from Anywhere).
   - Alternatively, configure an Atlas peering connection or static outbound IP if using dedicated cloud hosting.
5. **Get Connection String:** Click **Database** $\rightarrow$ **Connect** $\rightarrow$ **Drivers** (Node.js). Copy the SRV string:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/tikitaka?retryWrites=true&w=majority
   ```
   *(Ensure any special characters in the password are URL-encoded).*

---

### Step 2: Deploy Backend to Render
You can deploy using either the automated Blueprint or manual Web Service creation.

#### Option A: 1-Click Blueprint (Recommended)
1. Push your repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com), click **New** $\rightarrow$ **Blueprint**.
3. Select your `TikiTaka` repository. Render will automatically detect [render.yaml](render.yaml).
4. Render will prompt you for:
   - `MONGODB_URI`: Paste your MongoDB Atlas connection string.
   - `FRONTEND_URL`: Enter your anticipated Vercel frontend URL (e.g., `https://tikitaka.vercel.app` or placeholder until Vercel provides it).
5. Click **Apply**. Render will generate `JWT_SECRET`, build the service, and start listening on port 10000.

#### Option B: Manual Web Service
1. In Render Dashboard, click **New** $\rightarrow$ **Web Service**.
2. Connect your GitHub repository.
3. Configure the service settings:
   - **Name:** `tikitaka-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. Add the following **Environment Variables**:
   | Variable | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production security & optimizations |
   | `PORT` | `10000` | Render standard port |
   | `MONGODB_URI` | `mongodb+srv://...` | Your Atlas connection string |
   | `JWT_SECRET` | *(Random 32+ char string)* | Cryptographic signing key |
   | `JWT_EXPIRES_IN` | `7d` | Token expiration |
   | `COOKIE_SAMESITE` | `none` | **CRITICAL for cross-domain Vercel/Render cookies** |
   | `FRONTEND_URL` | `https://tikitaka.vercel.app` | Your deployed Vercel domain |
5. Click **Deploy Web Service**.
6. Note your backend URL (e.g. `https://tikitaka-backend.onrender.com`).
7. Verify by visiting `https://tikitaka-backend.onrender.com/api/health` in your browser.

---

### Step 3: Deploy Frontend to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project** and import your GitHub repository.
3. Configure the Project Settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Click "Edit" and select `frontend`.
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Add the following **Environment Variable**:
   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-render-backend>.onrender.com/api` |
5. Click **Deploy**.
6. When deployment finishes, note your production domain (e.g. `https://tikitaka.vercel.app`).
7. Single-Page Application (SPA) deep linking is handled automatically by [frontend/vercel.json](frontend/vercel.json).

---

### Step 4: Final Domain Synchronization
1. Go back to your **Render Dashboard** $\rightarrow$ `tikitaka-backend` $\rightarrow$ **Environment**.
2. Ensure `FRONTEND_URL` exactly matches your actual deployed Vercel domain (e.g., `https://tikitaka.vercel.app` without a trailing slash).
3. If Render does not auto-restart, click **Manual Deploy** $\rightarrow$ **Deploy latest commit**.

---

## 🔒 Security Best Practices Implemented

1. **HTTP-Only, Secure, SameSite=None Cookies:** Authentication tokens are stored in cookies inaccessible to JavaScript, eliminating token exfiltration via XSS.
2. **CORS & CSRF Origin Enforcement:** Cross-origin mutations are strictly validated against `FRONTEND_URL`. Unapproved origins are rejected with HTTP 403.
3. **Brute-Force Rate Limiting:** Login endpoint is protected with `express-rate-limit` (5 failed attempts per 15 minutes per IP in production).
4. **Helmet Security Headers:** Injects standard security HTTP response headers (`X-Content-Type-Options`, `HSTS`, `Frameguard`, `DNS Prefetch Control`).
5. **Fail-Fast Boot Validation:** Server fails to boot in production if required security variables (like `JWT_SECRET`) are missing or using template placeholders.
6. **No Leaked Credentials:** Password hashes are flagged with `select: false` in Mongoose and never returned in API payloads.

---

## 🩺 System Verification & Health Endpoint

The backend provides a public diagnostic endpoint at `GET /api/health`:

```json
{
  "status": "ok",
  "server": "reachable",
  "service": "tikitaka-backend",
  "timestamp": "2026-10-21T06:50:00.000Z",
  "uptime": 120,
  "environment": "production",
  "database": {
    "status": "connected",
    "connected": true
  }
}
```
