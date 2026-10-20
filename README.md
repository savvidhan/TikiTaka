# ⚽ TikiTaka

> Grassroots football team, player, match scheduling, and live score management web platform inspired by CricHeroes.

---

## 🚀 Tech Stack

### Frontend
- **Framework:** React 19 + Vite 6
- **Language:** JavaScript (JSX)
- **Styling:** Tailwind CSS v4 (Pitch-inspired dark theme with emerald/neon grass accents)
- **Routing:** React Router v7
- **Icons:** Lucide React
- **API Client:** Native fetch client with centralized error handling & diagnostics

### Backend
- **Runtime:** Node.js (v24+)
- **Framework:** Express.js (ES Modules)
- **Database ODM:** Mongoose (v8+) for MongoDB
- **Security:** Helmet (HTTP headers), CORS origin validation, express-rate-limit
- **Validation:** Zod schema validation
- **Dev Tools:** Nodemon for live server reloading

### Database
- **Primary Database:** MongoDB (MongoDB Atlas cloud cluster or local MongoDB instance)
- **No SQL / No Prisma:** Zero Prisma, PostgreSQL, or SQLite dependencies in the project

---

## 📁 Project Directory Structure

```text
tikitaka/
├── frontend/
│   ├── public/
│   │   └── football.svg
│   ├── src/
│   │   ├── assets/              # Static assets
│   │   ├── components/
│   │   │   ├── layout/          # Navbar, Footer
│   │   │   ├── teams/           # Team management components (future)
│   │   │   └── matches/         # Match & scoreboard components (future)
│   │   ├── pages/               # LandingPage, etc.
│   │   ├── services/
│   │   │   └── api.js           # Centralized API fetch client & health checker
│   │   ├── hooks/               # Custom React hooks
│   │   ├── App.jsx              # Main routing & application state
│   │   ├── main.jsx             # React DOM entry point
│   │   └── index.css            # Tailwind CSS v4 entry & theme layers
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── .env.example
│   └── .env
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js      # Mongoose connection & state check
│   │   ├── models/              # Mongoose data schemas
│   │   ├── routes/              # Express API route modules
│   │   ├── controllers/         # Request handling & controllers
│   │   ├── services/            # Business logic layer
│   │   ├── middleware/          # Custom middleware (auth, validation)
│   │   ├── utils/               # Shared utilities
│   │   ├── app.js               # Express application configuration
│   │   └── server.js            # Server bootstrap & graceful shutdown
│   ├── tests/                   # Test suites
│   ├── package.json
│   ├── .env.example
│   └── .env
├── .gitignore
├── package.json                 # Root script runner
└── README.md
```

---

## 🛠️ Environment Configuration

### 1. Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` (already created with safe defaults):

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/tikitaka?retryWrites=true&w=majority
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

#### MongoDB Atlas Setup Instructions:
1. Log into your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) dashboard.
2. In **Network Access**, ensure your IP address is whitelisted (or `0.0.0.0/0` during development).
3. In **Database Access**, create a user with read/write permissions.
4. Under **Clusters**, click **Connect** → **Drivers** → **Node.js**.
5. Copy the connection string and replace `<username>`, `<password>`, and `<cluster>` in `backend/.env`.

### 2. Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env` (already created with local defaults):

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 🏃 Running the Application

Open two terminal windows:

### Terminal 1 — Backend
```bash
cd backend
npm run dev
```
The API server starts on **http://localhost:5000**.
Health check: **http://localhost:5000/api/health**

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```
The React application opens on **http://localhost:5173**.

---

## 🩺 System Verification & Health Endpoint

The backend provides a standardized diagnostic endpoint at `GET /api/health`:

```json
{
  "status": "ok",
  "server": "reachable",
  "service": "tikitaka-backend",
  "timestamp": "2026-10-20T12:08:36.611Z",
  "uptime": 24,
  "environment": "development",
  "database": {
    "status": "connected",
    "connected": true
  }
}
```

If MongoDB credentials have not yet been provided, the backend safely continues running in development mode, reporting `server: "reachable"` and `database: { status: "disconnected", connected: false }` to avoid unhandled crashes.
