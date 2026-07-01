# 🧘 YogaBliss

An online yoga studio built on the MERN stack. Browse yoga courses, enroll, and follow
along with **on-demand video lectures** while tracking your progress. Includes an admin
panel for creating courses and uploading lecture videos.

> A rebuilt, cleaned-up version of the YogaBliss e-learning project — same look and features,
> with easy-to-read code and a setup that runs anywhere for free.

## Features

- **Authentication** — register / login with JWT, hashed passwords (bcrypt)
- **Course catalog** — browse courses with cover images, price, instructor, duration
- **Free enrollment** — one click to enroll (the original used Razorpay; see note below)
- **Video lectures** — watch course videos, mark lectures complete, see a progress bar
- **My Account** — profile and a list of enrolled courses
- **Admin panel** — create courses (with cover image upload), add video lectures (upload),
  delete courses, view users, and see totals (courses / lectures / users)
- **Role-based access** — `user` vs `admin`; lectures are locked until you enroll

## Tech stack

| Layer     | Tech                                                             |
| --------- | --------------------------------------------------------------- |
| Frontend  | React 18, Vite, React Router, Axios, react-hot-toast, react-icons |
| Backend   | Node.js, Express, JWT, bcryptjs, Multer (file uploads)          |
| Database  | MongoDB + Mongoose                                              |
| Styling   | Plain CSS (green + purple theme), responsive                    |
| Hosting   | MongoDB Atlas · Render (API) · Vercel (frontend) — all free tier |

### What changed from the original repo (and why)

The original app used two paid/external services that make it hard to run for free:

- **Razorpay payments** → replaced with a **free "Enroll" button**. Enrolling just adds the
  course to your account. (The payment logic can be added back on the `/enroll` route.)
- **Email OTP verification (nodemailer)** → replaced with **direct signup**. You register and
  are logged in immediately, no email server needed.

Everything else — courses, video lectures, progress, admin uploads — works the same.

## Project structure

```
.
├── client/                     # React + Vite frontend
│   ├── public/yoga.png         # logo
│   └── src/
│       ├── api.js              # axios instance + media URL helper
│       ├── assets/             # hero/about banner images
│       ├── context/            # UserContext (auth), CourseContext
│       ├── components/         # Header, Footer, CourseCard, Testimonials, Loading
│       └── pages/              # Home, Courses, CourseDescription, CourseStudy,
│                               #   Account, Login, Register, About, Admin
├── server/                     # Express REST API
│   ├── uploads/                # course images + sample lecture video (served at /uploads)
│   └── src/
│       ├── config/db.js
│       ├── models/             # User, Course, Lecture, Progress
│       ├── middleware/         # auth (JWT + admin), upload (multer), validate, errors
│       ├── routes/             # auth, courses, admin
│       └── seed/seed.js        # demo admin, learner, courses, lectures
├── render.yaml                 # Render deploy blueprint
└── README.md
```

## Getting started (local)

### Prerequisites
- Node.js 18+ and npm
- MongoDB — either a local `mongod`, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 1. Backend

```bash
cd server
npm install
cp .env.example .env      # edit values (see below)
npm run seed              # creates demo admin, learner, courses + lectures
npm run dev               # http://localhost:5000
```

`server/.env`:
```
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/yogabliss   # or your Atlas string
JWT_SECRET=<a long random string>
JWT_EXPIRES_IN=7d
CLIENT_ORIGIN=http://localhost:5173
```
Generate a secret: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

### 2. Frontend

```bash
cd client
npm install
cp .env.example .env      # VITE_SERVER=http://localhost:5000
npm run dev               # http://localhost:5173
```

Open http://localhost:5173.

### Demo logins (created by the seed)
| Role    | Email                 | Password  |
| ------- | --------------------- | --------- |
| Learner | demo@yogabliss.com    | demo123   |
| Admin   | admin@yogabliss.com   | admin123  |

## API reference

Base URL: `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Endpoint                          | Access | Description                        |
| ------ | --------------------------------- | ------ | ---------------------------------- |
| POST   | `/auth/register`                  | –      | Create account, returns token+user |
| POST   | `/auth/login`                     | –      | Log in                             |
| GET    | `/auth/me`                        | user   | Current user                       |
| GET    | `/courses`                        | –      | All courses                        |
| GET    | `/courses/:id`                    | –      | One course                         |
| GET    | `/courses/mine`                   | user   | Courses I'm enrolled in            |
| POST   | `/courses/:id/enroll`             | user   | Free enrollment                    |
| GET    | `/courses/:id/lectures`           | user*  | Lectures (must be enrolled/admin)  |
| GET    | `/courses/:id/progress`           | user   | Progress % for a course            |
| POST   | `/courses/:id/progress`           | user   | Mark a lecture complete            |
| POST   | `/admin/courses`                  | admin  | Create course (multipart, `file`)  |
| POST   | `/admin/courses/:id/lectures`     | admin  | Add lecture (multipart, `file`)    |
| DELETE | `/admin/courses/:id`              | admin  | Delete course + lectures           |
| DELETE | `/admin/lectures/:id`             | admin  | Delete a lecture                   |
| GET    | `/admin/stats`                    | admin  | Totals for the dashboard           |
| GET    | `/admin/users`                    | admin  | List users                         |

Uploaded media is served from `/uploads/<file>`.

## Deployment (free tier)

Deploy in this order: **Atlas → Render → Vercel**.

1. **MongoDB Atlas** — create a free M0 cluster, add a DB user, allow network access from
   `0.0.0.0/0`, and copy the connection string into Render's `MONGO_URI`.
2. **Render (backend)** — New Web Service, Root Directory `server`, Build `npm install`,
   Start `npm start`. Env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`,
   `NODE_ENV=production`, `CLIENT_ORIGIN=<your Vercel URL>`. After deploy, open the Render
   Shell and run `npm run seed` once to create the demo data.
3. **Vercel (frontend)** — Import the repo, Root Directory `client`, framework Vite. Add env
   var `VITE_SERVER=https://<your-render-app>.onrender.com`. Deploy.

> **Note on uploads:** Render's free filesystem is *ephemeral* — files uploaded at runtime are
> lost on restart. The seeded course images and sample video live in git, so the demo always
> works. For persistent user uploads in production, use a storage service (e.g. Cloudinary).

> Render's free service sleeps after 15 min idle; the first request wakes it in ~30s.

## Push to GitHub

```bash
git add .
git commit -m "YogaBliss course platform"
git branch -M main
git remote add origin https://github.com/<you>/yogabliss.git
git push -u origin main
```

## License

MIT
