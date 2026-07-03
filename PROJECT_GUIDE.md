# 📘 YogaBliss — Complete Project Guide

> **One document with everything.** If you read this top to bottom, you'll be able to
> answer almost any question about how YogaBliss is built, how the data flows, where
> things are stored, and what every file does.

**Live app:** https://yogabliss-mern-elearning.vercel.app
**Live API:** https://yogabliss-api.onrender.com
**Repo:** https://github.com/riiddhii28/yogabliss-mern-elearning

**Demo logins**
- Admin → `admin@yogabliss.com` / `admin123`
- User → `demo@yogabliss.com` / `demo123`

---

## 1. What is YogaBliss?

A **yoga course platform** (an e-learning / online course app). Users can:
- Browse yoga courses, read details, and enroll (free).
- Watch video lectures inside each course.
- Track their progress (which lectures they've completed, as a percentage).

Admins can:
- Create and delete courses.
- Upload video lectures.
- See stats (total courses, lectures, users) and the list of users.

It's a classic **MERN** application — MongoDB, Express, React, Node.

---

## 2. Tech Stack (what we used and why)

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast, modern UI. Vite gives instant dev + optimized builds. |
| **Routing** | React Router v6 | Page navigation without full reloads (single-page app). |
| **HTTP client** | Axios | Talks to the backend API; auto-attaches the login token. |
| **UI extras** | react-hot-toast, react-icons | Toast notifications + icons. |
| **Styling** | Plain CSS + Tailwind (configured) | Component CSS files, utility classes available. |
| **Backend** | Node.js + Express 4 | REST API server. |
| **Database** | MongoDB (via Mongoose) | Stores users, courses, lectures, progress. |
| **Auth** | JWT (jsonwebtoken) + bcryptjs | Stateless login tokens + hashed passwords. |
| **Media** | Cloudinary | Stores images + videos on a CDN (persistent + fast). |
| **Uploads** | Multer | Parses uploaded files before they go to Cloudinary. |
| **Security** | helmet, express-rate-limit, cors, compression | Headers, brute-force limits, cross-origin rules, gzip. |
| **Validation** | express-validator | Checks incoming data (email format, password length). |

### Where each part is hosted (all free tiers)

| Service | Hosts | Free tier limit |
|---|---|---|
| **Vercel** | The React frontend | 100 GB bandwidth/mo |
| **Render** | The Express API | Sleeps after 15 min idle; ~30–50s cold start |
| **MongoDB Atlas** | The database | 512 MB storage |
| **Cloudinary** | Images + videos | 25 GB storage + 25 GB bandwidth/mo |

**Total cost: $0/month.**

---

## 3. The Big Picture (how it all connects)

```
   ┌─────────────┐        HTTPS / JSON        ┌──────────────┐
   │   BROWSER   │  ───────────────────────>  │   RENDER     │
   │  (React on  │   (Axios, JWT in header)   │  Express API │
   │   Vercel)   │  <───────────────────────  │              │
   └─────┬───────┘                            └──────┬───────┘
         │                                           │
         │ loads images/video                        │ Mongoose queries
         │ directly from CDN                         ▼
         │                                    ┌──────────────┐
         │                                    │ MongoDB Atlas│
         │                                    │  (database)  │
         ▼                                    └──────────────┘
   ┌─────────────┐
   │ CLOUDINARY  │   ← admin uploads land here; browser streams from here
   │   (CDN)     │
   └─────────────┘
```

**Key idea:** the database only stores a **URL** pointing to each image/video. The actual
media files live on Cloudinary's CDN, and the browser downloads them **straight from
Cloudinary** — not through the Render server. This keeps the free Render dyno fast and
means uploads survive server restarts.

---

## 4. How MongoDB is implemented

### 4.1 Connection
- The connection string (`MONGO_URI`) lives in an environment variable, never in code.
- `server/src/config/db.js` opens the connection with Mongoose:
  ```js
  mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  ```
- It's called once at startup from `server/src/index.js`. If it can't connect, the
  server refuses to start (fail-fast with a clear error).
- **Atlas Network Access must allow `0.0.0.0/0`** so Render's servers can reach it.
  (This was the one deploy issue we hit — see §11.)

### 4.2 The 4 collections (data models)

Mongoose "models" = MongoDB collections. Each file in `server/src/models/` defines one.

**`User`** (`models/User.js`) — a person with an account.
| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `email` | String | required, **unique**, lowercased |
| `passwordHash` | String | bcrypt hash; `select: false` so it's never returned by default |
| `role` | `"user"` \| `"admin"` | admins can manage courses |
| `subscription` | [Course IDs] | the courses this user is enrolled in |
- Methods: `setPassword()` (hashes), `comparePassword()` (checks login), `toPublicJSON()` (safe shape — never leaks the hash).

**`Course`** (`models/Course.js`) — a yoga course.
| Field | Type | Notes |
|---|---|---|
| `title`, `description`, `category` | String | |
| `image` | String | **Cloudinary URL** of the cover image |
| `imageId` | String | Cloudinary `public_id` (used to delete it) |
| `price` | Number | ₹; 0 = free |
| `duration` | Number | in weeks |
| `createdBy` | String | instructor name |

**`Lecture`** (`models/Lecture.js`) — one video lesson inside a course.
| Field | Type | Notes |
|---|---|---|
| `title`, `description` | String | |
| `video` | String | **Cloudinary URL** of the video |
| `videoId` | String | Cloudinary `public_id` |
| `course` | Course ID | which course it belongs to (**indexed**) |

**`Progress`** (`models/Progress.js`) — tracks completion.
| Field | Type | Notes |
|---|---|---|
| `user` | User ID | |
| `course` | Course ID | |
| `completedLectures` | [Lecture IDs] | which lectures this user finished |
- Unique index on `{ user, course }` → exactly **one progress row per user per course**.

### 4.3 How they relate
```
User  ──(subscription: [Course])──>  Course  ──(1 course has many)──>  Lecture
  │                                     │
  └────────── Progress ────────────────┘   (one row per user+course,
             completedLectures: [Lecture]    listing finished lectures)
```

---

## 5. Authentication — how login works

We use **JWT (JSON Web Tokens)**. No server-side sessions — the token *is* the proof of login.

**Flow:**
1. User submits email + password → `POST /api/auth/login`.
2. Server looks up the user, `bcrypt.compare()`s the password against `passwordHash`.
3. If correct, it signs a JWT containing the user's ID (`signToken()` in `middleware/auth.js`), valid for 7 days.
4. Token is returned to the browser and saved in `localStorage` under the key `yb_token`.
5. On every future request, Axios automatically attaches it: `Authorization: Bearer <token>` (see `client/src/api.js` interceptor).
6. Protected routes run `requireAuth` middleware, which verifies the token and loads `req.user`. Admin routes additionally run `requireAdmin` (checks `role === "admin"`).

**Passwords are never stored in plain text** — only the bcrypt hash, and it's marked
`select: false` so it never accidentally gets sent to the client.

**Where is the token stored?** In the browser's `localStorage` (`yb_token`). On page
reload, `UserContext` reads it and calls `/api/auth/me` to restore the session.

---

## 6. How media (images & video) works

This is the part that makes it deployable for free.

1. **Admin uploads** a file (course image or lecture video) via the admin panel.
2. **Multer** (`middleware/upload.js`) catches the file in memory (200 MB cap).
3. `storeUpload` sends the buffer to **Cloudinary** (`config/cloudinary.js` → `uploadBuffer()`).
4. Cloudinary returns a permanent CDN URL + a `public_id`.
5. Only the **URL + public_id are saved in MongoDB** — the file itself lives on Cloudinary.
6. When a user views a course, the browser loads the image/video **directly from Cloudinary's CDN**.

**Bonus optimizations (in `client/src/api.js`):**
- `thumbUrl()` rewrites Cloudinary URLs to auto-resize + compress images on the fly
  (a ~2.5 MB image becomes a ~60 KB thumbnail) using `w_600,c_limit,f_auto,q_auto`.
- Videos support **range requests**, so users can seek/scrub during playback.

**Dev fallback:** if Cloudinary keys aren't set (local development), uploads are saved
to `server/uploads/` on disk instead. The code auto-detects which mode it's in via
`cloudinaryEnabled`.

---

## 7. The complete request flow (a real example)

**"A user enrolls in a course and watches a lecture":**

1. Browser loads the course list → `GET /api/courses` (public, no login needed).
2. User clicks a course → `GET /api/courses/:id` shows details.
3. User clicks **Enroll** → `POST /api/courses/:id/enroll` (needs token).
   - Server adds the course to the user's `subscription` array.
   - Server creates a `Progress` record for that user+course.
4. Now the user opens the study page → `GET /api/courses/:id/lectures`.
   - Server checks `hasAccess()`: is the user enrolled (or an admin)? If not → **403**.
   - If yes → returns the lecture list (with Cloudinary video URLs).
5. The `<video>` tag streams the video **directly from Cloudinary**.
6. When a lecture finishes → `POST /api/courses/:id/progress` with the lecture ID.
   - Server adds it to `completedLectures` and returns the new percentage.
7. The Account page shows progress bars via `GET /api/courses/mine/progress`.

---

## 8. Complete API reference

Base URL: `https://yogabliss-api.onrender.com/api`

### Auth (`routes/auth.js`)
| Method | Endpoint | Auth | What it does |
|---|---|---|---|
| POST | `/auth/register` | — | Create account, returns token |
| POST | `/auth/login` | — | Log in, returns token |
| GET | `/auth/me` | ✅ | Get the current logged-in user |

### Courses (`routes/courses.js`)
| Method | Endpoint | Auth | What it does |
|---|---|---|---|
| GET | `/courses` | — | List all courses (public) |
| GET | `/courses/:id` | — | One course's details |
| GET | `/courses/mine` | ✅ | Courses the user is enrolled in |
| GET | `/courses/mine/progress` | ✅ | Progress across all enrolled courses |
| POST | `/courses/:id/enroll` | ✅ | Enroll (free) |
| GET | `/courses/:id/lectures` | ✅ (enrolled/admin) | List lectures — **gated** |
| POST | `/courses/:id/progress` | ✅ | Mark a lecture complete |
| GET | `/courses/:id/progress` | ✅ | Get % complete for a course |

### Admin (`routes/admin.js`) — all require an admin token
| Method | Endpoint | What it does |
|---|---|---|
| POST | `/admin/courses` | Create a course (with cover image upload) |
| POST | `/admin/courses/:id/lectures` | Add a video lecture |
| DELETE | `/admin/courses/:id` | Delete a course + its lectures + media |
| DELETE | `/admin/lectures/:id` | Delete a lecture + its video |
| GET | `/admin/stats` | Counts: courses, lectures, users |
| GET | `/admin/users` | List all users |

### Utility
| Method | Endpoint | What it does |
|---|---|---|
| GET | `/health` | Returns `{status:"ok"}` (used by Render health check) |

---

## 9. What every file does

### Backend (`server/`)
```
server/
├── package.json              Dependencies + scripts (start, dev, seed)
├── .env / .env.example       Secrets (MONGO_URI, JWT_SECRET, Cloudinary keys)
└── src/
    ├── index.js              ENTRY POINT. Validates env, connects DB, starts server.
    ├── app.js                Builds the Express app: middleware, CORS, routes, rate limit.
    │
    ├── config/
    │   ├── db.js             Connects to MongoDB via Mongoose.
    │   └── cloudinary.js     Cloudinary setup + upload/delete helpers.
    │
    ├── models/               MongoDB schemas (see §4.2)
    │   ├── User.js           Accounts, password hashing, roles.
    │   ├── Course.js         Courses.
    │   ├── Lecture.js        Video lectures.
    │   └── Progress.js       Per-user course completion.
    │
    ├── middleware/
    │   ├── auth.js           requireAuth (verify token), requireAdmin, signToken.
    │   ├── upload.js         Multer + push file to Cloudinary/disk.
    │   ├── validate.js       Returns 422 if express-validator finds bad input.
    │   └── errorHandler.js   404 handler + central error handler.
    │
    ├── routes/
    │   ├── auth.js           /api/auth/* (register, login, me).
    │   ├── courses.js        /api/courses/* (list, enroll, lectures, progress).
    │   └── admin.js          /api/admin/* (create/delete courses & lectures, stats).
    │
    ├── utils/
    │   └── asyncHandler.js   Wraps async routes so errors reach errorHandler.
    │
    └── seed/
        └── seed.js           Populates demo data (run: npm run seed).
```

### Frontend (`client/`)
```
client/
├── package.json              React/Vite dependencies + scripts.
├── vite.config.js            Vite config; proxies /api to localhost:5000 in dev.
├── index.html                HTML shell React mounts into.
├── .env / .env.example       VITE_SERVER = the API URL.
└── src/
    ├── main.jsx              ENTRY POINT. Wraps App in Router + User/Course providers.
    ├── App.jsx               All page routes + auth/role guards.
    ├── api.js                Axios instance, JWT interceptor, mediaUrl/thumbUrl helpers.
    ├── App.css               Global styles.
    │
    ├── context/
    │   ├── UserContext.jsx   Login/register/logout, current user, token handling.
    │   └── CourseContext.jsx Fetches + holds the course list app-wide.
    │
    ├── components/
    │   ├── Header.jsx        Nav bar.
    │   ├── Footer.jsx        Footer.
    │   ├── CourseCard.jsx    A course tile in the grid.
    │   ├── Loading.jsx       Spinner shown while auth/token is checked.
    │   └── Testimonials.jsx  Homepage testimonials.
    │
    └── pages/
        ├── Home.jsx              Landing page (hero, featured courses).
        ├── About.jsx            About page.
        ├── Courses.jsx          Browse/search/filter all courses.
        ├── CourseDescription.jsx  One course's detail + Enroll button.
        ├── CourseStudy.jsx      Video player + lecture list + progress.
        ├── Account.jsx          User's enrolled courses + progress bars.
        ├── Login.jsx            Login form.
        ├── Register.jsx         Sign-up form.
        └── Admin.jsx            Admin panel (lazy-loaded; create/delete content).
```

### Root
```
render.yaml            Render Blueprint (auto-configures the backend deploy).
.github/workflows/ci.yml   GitHub Actions CI.
README.md              Project overview.
ARCHITECTURE.md        Deeper architecture notes.
DEPLOY.md              Step-by-step deploy guide.
DEPLOYMENT_NOTES.md    Short log of our actual deployment + the issue we hit.
PROJECT_GUIDE.md       ← this file (the complete reference).
```

---

## 10. Security measures (what protects the app)

- **Passwords hashed** with bcrypt (never stored or returned in plain text).
- **JWT auth** — every protected route verifies the token.
- **Role checks** — admin routes reject non-admins (403).
- **Enrollment gate** — lecture videos are hidden until you enroll (403).
- **Rate limiting** — 20 login/register attempts per 15 min per IP (blocks brute force).
- **helmet** — sets safe HTTP headers.
- **CORS** — only the known frontend origin (`CLIENT_ORIGIN`) may call the API with credentials.
- **Input validation** — express-validator checks email format, password length, etc.
- **Env validation at boot** — server won't start with a missing/weak `JWT_SECRET` in production.
- **Secrets never committed** — all keys live in Render/Vercel dashboards, not in git.

---

## 11. How we deployed it (and the one issue we hit)

**Order:** MongoDB Atlas → Cloudinary → Render (backend) → Vercel (frontend) → connect via CORS.

**Environment variables set on Render:**
`MONGO_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (the Vercel URL), and the three `CLOUDINARY_*` keys.
**On Vercel:** `VITE_SERVER` = the Render API URL.

**The one problem:** the first Render deploy built fine but crashed at startup:
> *"Could not connect to any servers in your MongoDB Atlas cluster... IP isn't whitelisted."*

**Cause:** Atlas only accepts connections from whitelisted IPs. Our local machine's IP
was allowed (so local tests worked), but **Render's server IPs were blocked**.

**Fix:** In Atlas → **Network Access** → add `0.0.0.0/0` (allow from anywhere), which is
required for free hosts whose IPs change. Then redeploy. ✅

**Note:** Render's free tier has no shell, so we couldn't run `npm run seed` there —
instead we ran the seed **locally pointed at the production database + Cloudinary**, which
populated the same cloud data.

*(Full narrative in `DEPLOYMENT_NOTES.md`; full step-by-step in `DEPLOY.md`.)*

---

## 12. Running it locally

```bash
# 1. Backend
cd server
cp .env.example .env        # fill in MONGO_URI + JWT_SECRET (Cloudinary optional locally)
npm install
npm run seed                # optional: demo data
npm run dev                 # starts API on http://localhost:5000

# 2. Frontend (new terminal)
cd client
cp .env.example .env        # VITE_SERVER=http://localhost:5000
npm install
npm run dev                 # opens http://localhost:5173
```

Locally, without Cloudinary keys, uploads save to `server/uploads/` on disk.

---

## 13. Verified working (automated test — 18/18 passed)

We ran an end-to-end test against the live site. All passed:
- Infra: API health, frontend loads.
- Auth: login (admin + user), wrong password rejected, `/me` protected.
- Courses: 3 listed, detail loads, missing → 404.
- Enrollment flow: register → lectures blocked (403) → enroll → lectures visible → progress = 50%.
- Admin: stats work, non-admin blocked from admin API (403).
- Media: video streams from Cloudinary (range request), images load from CDN.

---

## 14. Quick FAQ (answers you might get asked)

**Q: Why is the first load slow?** Render's free backend sleeps after 15 min idle; the
first request wakes it (~30–50s). Then it's fast.

**Q: Where are the videos stored?** On Cloudinary's CDN. MongoDB only stores their URLs.

**Q: Where is the login token stored?** In the browser's `localStorage` as `yb_token`.

**Q: How are passwords secured?** Hashed with bcrypt; the hash is never sent to the client.

**Q: What stops a non-enrolled user from watching?** The `/lectures` endpoint checks
enrollment (`hasAccess`) and returns 403 if you're not enrolled.

**Q: How does the frontend know the backend URL?** Via the `VITE_SERVER` env var (set on Vercel).

**Q: Is it really free?** Yes — all four services are free-forever tiers. $0/month.

**Q: What happens when I push code?** Render and Vercel are connected to GitHub, so a
`git push` to `main` auto-redeploys both.
