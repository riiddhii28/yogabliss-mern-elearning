# 🧘 YogaBliss

> An online yoga studio built on the **MERN stack** — browse courses, enroll free, follow
> on-demand **video lectures**, and track your progress. Includes a full **admin panel**
> for creating courses and uploading lecture videos.

<p align="center">
  <b>React + Vite</b> · <b>Express API</b> · <b>MongoDB</b> · <b>JWT Auth</b> · <b>Cloudinary media</b>
</p>

---

## 📚 Documentation map

| File | What's inside |
| --- | --- |
| **README.md** (this file) | Overview, features, tech stack, quick start, API reference |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | How everything works — system diagram, request flows, data models, auth, media pipeline |
| **[DEPLOY.md](DEPLOY.md)** | Click-by-click free deployment: Atlas → Cloudinary → Render → Vercel |

---

## ✨ Features

- 🔐 **Authentication** — register/login with JWT; passwords hashed with bcrypt
- 🗂️ **Course catalog** — cover images, category & price badges, instructor, duration
- 🎟️ **Free enrollment** — one click to enroll (payment hook point kept for later)
- 🎥 **Video lectures** — watch course videos, mark lectures complete
- 📊 **Progress tracking** — per-user, per-course progress bar with completion ticks
- 👤 **My Account** — profile + list of enrolled courses
- 🛠️ **Admin panel** — create courses (image upload), add lectures (video upload),
  delete courses, view users, dashboard totals
- 🧑‍⚖️ **Role-based access** — `user` vs `admin`; lectures locked until enrolled
- 🎨 **Polished UI** — full-screen hero, bold Poppins/Inter typography, solid buttons,
  card hover effects, engagement CTA band, responsive throughout

## 🧰 Tech stack (and why each piece)

| Layer | Tech | Why |
| --- | --- | --- |
| UI framework | **React 18** | Component model fits reusable pieces (cards, header, player) |
| Build tool | **Vite** | Instant dev server + hot reload; much faster than CRA |
| Routing | **React Router 6** | Client-side page switching for a SPA |
| HTTP client | **Axios** | Interceptor auto-attaches the JWT to every request |
| UX extras | **react-hot-toast**, **react-icons** | Toasts and icons with zero config |
| Runtime | **Node.js 18+** | One language (JS) across the whole stack |
| API | **Express** | Minimal, standard REST framework for Node |
| Database | **MongoDB + Mongoose** | Document model maps cleanly to courses/lectures; schema validation |
| Auth | **JWT + bcryptjs** | Stateless tokens — no session store needed (free-host friendly) |
| Uploads | **Multer + Cloudinary** | Multer receives files; Cloudinary stores media on a persistent CDN |
| Hardening | **helmet, cors, morgan** | Safe headers, origin control, request logs |
| Styling | Plain **CSS** with design tokens | Poppins/Inter fonts, green+purple theme, no framework needed |
| Hosting | **Atlas · Cloudinary · Render · Vercel** | Everything runs on free tiers ([DEPLOY.md](DEPLOY.md)) |

## 🗺️ How it fits together (10-second version)

```
Browser (React :5173) ──axios──► Express API (:5000) ──mongoose──► MongoDB
        │                             │
        │  <img>/<video> src          │ stores only media URLs
        ▼                             ▼
   Cloudinary CDN (prod)  /  server/uploads/ on disk (dev)
```

The client never touches the database — it always goes through the API.
Media files are **not** in the database; only their URLs are.
Full detail with request flows in **[ARCHITECTURE.md](ARCHITECTURE.md)**.

## 📁 Project structure

```
.
├── client/                     # React + Vite frontend
│   ├── index.html              # entry (loads Poppins/Inter fonts)
│   ├── public/yoga.png         # logo
│   └── src/
│       ├── api.js              # axios instance + mediaUrl() helper
│       ├── App.css             # design tokens + shared styles
│       ├── assets/             # hero/about banner images
│       ├── context/            # UserContext (auth), CourseContext
│       ├── components/         # Header, Footer, CourseCard, Testimonials, Loading
│       └── pages/              # Home, Courses, CourseDescription, CourseStudy,
│                               #   Account, Login, Register, About, Admin
├── server/                     # Express REST API
│   ├── uploads/                # dev media (seed images + sample video)
│   └── src/
│       ├── config/             # db.js, cloudinary.js
│       ├── models/             # User, Course, Lecture, Progress
│       ├── middleware/         # auth (JWT + admin), upload (multer→CDN/disk), validate, errors
│       ├── routes/             # auth, courses, admin
│       └── seed/seed.js        # demo admin, learner, courses, lectures
├── render.yaml                 # Render deploy blueprint
├── ARCHITECTURE.md             # how it all works
├── DEPLOY.md                   # free deployment guide
└── README.md
```

## 🚀 Quick start (local)

**Prerequisites:** Node.js 18+, npm, and MongoDB (local `mongod` or a free
[Atlas](https://www.mongodb.com/atlas) cluster).

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # fill in values (see below)
npm run seed              # demo admin, learner, courses + lectures
npm run dev               # → http://localhost:5000
```

`server/.env` essentials:

```ini
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/yogabliss
JWT_SECRET=<long random string>          # node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
# Cloudinary keys optional locally — uploads fall back to server/uploads/ on disk
```

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env      # VITE_SERVER=http://localhost:5000
npm run dev               # → http://localhost:5173
```

### 3. Demo logins (created by the seed)

| Role | Email | Password |
| --- | --- | --- |
| Learner | `demo@yogabliss.com` | `demo123` |
| Admin | `admin@yogabliss.com` | `admin123` |

## 📡 API reference

Base URL: `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | Create account, returns token + user |
| POST | `/auth/login` | – | Log in |
| GET | `/auth/me` | user | Current user |
| GET | `/courses` | – | All courses |
| GET | `/courses/:id` | – | One course |
| GET | `/courses/mine` | user | Courses I'm enrolled in |
| POST | `/courses/:id/enroll` | user | Free enrollment |
| GET | `/courses/:id/lectures` | user\* | Lectures (must be enrolled, or admin) |
| GET | `/courses/:id/progress` | user | Progress % for a course |
| POST | `/courses/:id/progress` | user | Mark a lecture complete |
| POST | `/admin/courses` | admin | Create course (multipart, field `file`) |
| POST | `/admin/courses/:id/lectures` | admin | Add lecture (multipart, field `file`) |
| DELETE | `/admin/courses/:id` | admin | Delete course + lectures + media |
| DELETE | `/admin/lectures/:id` | admin | Delete a lecture + its video |
| GET | `/admin/stats` | admin | Totals for the dashboard |
| GET | `/admin/users` | admin | List users |

## ☁️ Deployment (all free tier)

Deploy order: **MongoDB Atlas → Cloudinary → Render (API) → Vercel (frontend)**.

Media persists across restarts because images/videos live on **Cloudinary's CDN** —
the database stores only URLs. Full step-by-step guide with every env var:
**[DEPLOY.md](DEPLOY.md)**.

> Render's free service sleeps after 15 min idle; the first request wakes it in ~30s.

