# 🧘 YogaBliss

A full-stack yoga activity tracker. Sign up, log your sessions, and watch your streaks,
weekly goal, and 30-day practice history come together on a dashboard. Built on the MERN
stack with JWT authentication.

> Portfolio project demonstrating REST API design, JWT auth, MongoDB schema modelling, and a
> React dashboard with data visualisation.

## Features

- **JWT authentication** — register / login, hashed passwords (bcrypt), protected routes
- **Activity tracking** — log sessions (date, duration, yoga type, notes); edit and delete
- **Dashboard** — current streak, total minutes/sessions, weekly-goal progress bar, and a
  30-day practice bar chart (Recharts)
- **Class catalog** — browse seeded yoga classes, filter by level
- **Profile & goals** — edit name and set a weekly practice goal (minutes)

## Tech stack

| Layer     | Tech                                                                 |
| --------- | -------------------------------------------------------------------- |
| Frontend  | React 18, Vite, React Router, Axios, Recharts, Tailwind CSS          |
| Backend   | Node.js, Express, JWT (`jsonwebtoken`), bcryptjs, express-validator  |
| Database  | MongoDB + Mongoose                                                   |
| Tooling   | ESLint/Prettier-ready, Nodemon, dotenv, Helmet, CORS, Morgan         |
| Hosting   | MongoDB Atlas (DB) · Render (API) · Vercel (frontend) — all free tier|

## Project structure

```
.
├── client/                 # React + Vite frontend
│   └── src/
│       ├── api/            # axios instance (JWT interceptor)
│       ├── context/        # AuthContext (login/register/logout)
│       ├── components/     # Navbar, ProtectedRoute, ActivityForm, StatCard
│       └── pages/          # Login, Register, Dashboard, Classes, Profile
├── server/                 # Express REST API
│   └── src/
│       ├── config/         # Mongo connection
│       ├── models/         # User, Activity, YogaClass (Mongoose schemas)
│       ├── middleware/     # auth (JWT), validation, error handling
│       ├── routes/         # auth, activities, classes, profile
│       ├── services/       # stats computation (streak, weekly, series)
│       └── seed/           # seed the class catalog
├── render.yaml             # Render deployment blueprint (optional)
└── README.md
```

## Getting started (local)

### Prerequisites
- Node.js 18+ and npm
- A MongoDB connection string — either [MongoDB Atlas](https://www.mongodb.com/atlas) (free
  M0 cluster) or a local `mongod` instance

### 1. Backend

```bash
cd server
npm install
cp .env.example .env        # then edit .env (see below)
npm run seed                # populate the yoga class catalog (run once)
npm run dev                 # starts on http://localhost:5000
```

`server/.env`:

```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/yogabliss
JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```

Generate a JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                 # starts on http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so no frontend env var is
needed locally. Open http://localhost:5173 and sign up.

## API reference

Base URL: `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Endpoint                | Auth | Description                                  |
| ------ | ----------------------- | ---- | -------------------------------------------- |
| POST   | `/auth/register`        | –    | Create account, returns `{ token, user }`    |
| POST   | `/auth/login`           | –    | Log in, returns `{ token, user }`            |
| GET    | `/auth/me`              | ✅   | Current user                                 |
| PUT    | `/profile`              | ✅   | Update name / weekly goal                    |
| GET    | `/activities`           | ✅   | List sessions (newest first, `?limit=`)      |
| POST   | `/activities`           | ✅   | Log a session                                |
| PUT    | `/activities/:id`       | ✅   | Update a session                             |
| DELETE | `/activities/:id`       | ✅   | Delete a session                             |
| GET    | `/activities/stats`     | ✅   | Streak, totals, weekly progress, series      |
| GET    | `/classes`              | –    | List classes (`?level=Beginner`)             |
| GET    | `/classes/:id`          | –    | Single class                                 |
| GET    | `/health`               | –    | Health check                                 |

Example — log a session:
```bash
curl -X POST http://localhost:5000/api/activities \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"durationMinutes":30,"yogaType":"Vinyasa","notes":"Morning flow"}'
```

## Deployment (free tier)

Three services, all free. Deploy in this order.

### 1. Database — MongoDB Atlas
1. Create a free **M0** cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. **Database Access** → add a user (username + password).
3. **Network Access** → add IP `0.0.0.0/0` (allow from anywhere — needed for Render).
4. **Connect → Drivers** → copy the connection string. Replace `<password>` and add
   `/yogabliss` before the `?`. This is your `MONGO_URI`.

### 2. Backend — Render
1. Push this repo to GitHub (see below).
2. On [render.com](https://render.com): **New + → Web Service** → connect the repo.
3. Settings: **Root Directory** `server`, **Build** `npm install`, **Start** `npm start`.
4. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`,
   `NODE_ENV=production`, and `CLIENT_ORIGIN` (your Vercel URL — set after step 3).
5. Deploy. Note the URL, e.g. `https://yogabliss-api.onrender.com`.
6. Seed the catalog once: locally run `npm run seed` with `MONGO_URI` pointed at Atlas, or
   use Render's **Shell** tab to run `npm run seed`.

> Render's free tier sleeps after 15 min of inactivity; the first request then takes ~30s to
> wake. Normal for a free portfolio app.

### 3. Frontend — Vercel
1. On [vercel.com](https://vercel.com): **Add New → Project** → import the repo.
2. Set **Root Directory** to `client`. Framework preset: **Vite** (auto-detected).
3. Add env var `VITE_API_URL` = `https://yogabliss-api.onrender.com/api` (your Render URL).
4. Deploy. Copy the Vercel URL and set it as `CLIENT_ORIGIN` back on Render (step 2.4), then
   redeploy the backend so CORS allows your frontend.

## Deploy to GitHub

```bash
git init
git add .
git commit -m "Initial commit: YogaBliss MERN app"
git branch -M main
git remote add origin https://github.com/<you>/yogabliss.git
git push -u origin main
```

## License

MIT
