# 🏗️ YogaBliss — Architecture

How the whole system works: the pieces, the request flows, the data models, and the
design decisions behind them. Written to be readable top-to-bottom.

> Companion docs: **[README.md](README.md)** (overview & quick start) ·
> **[DEPLOY.md](DEPLOY.md)** (free hosting guide)

---

## 1. The big picture

Three processes, one golden rule: **the browser never talks to the database — everything
goes through the API.**

```
┌─────────────────────────┐        ┌──────────────────────────┐        ┌─────────────┐
│  CLIENT  (React + Vite) │        │  SERVER  (Express)       │        │  DATABASE   │
│  http://localhost:5173  │ axios  │  http://localhost:5000   │mongoose│  MongoDB    │
│                         │ ─────► │                          │ ─────► │             │
│  pages/  components/    │  JSON  │  routes → middleware →   │        │  users      │
│  context/ (auth state)  │ ◄───── │  models                  │ ◄───── │  courses    │
│  api.js  (JWT attach)   │        │                          │        │  lectures   │
└───────────┬─────────────┘        └────────────┬─────────────┘        │  progresses │
            │  <img> / <video> src              │ uploads media,       └─────────────┘
            ▼                                   ▼ stores only the URL
     ┌────────────────────────────────────────────────┐
     │  MEDIA   Cloudinary CDN (production)           │
     │          server/uploads/ on disk (local dev)   │
     └────────────────────────────────────────────────┘
```

| Piece | Role | Key entry file |
| --- | --- | --- |
| Client | Renders pages, holds auth state, calls the API | `client/src/main.jsx` |
| Server | Business rules, auth checks, DB access, media uploads | `server/src/index.js` |
| MongoDB | Persistent data (users, courses, lectures, progress) | `server/src/config/db.js` |
| Media store | The actual image/video **files** | `server/src/config/cloudinary.js` |

---

## 2. Frontend anatomy

```
main.jsx
 └─ <BrowserRouter>
     └─ <UserProvider>          ← auth state (user, isAuth, login/logout)
         └─ <CourseProvider>    ← course list, fetched once
             └─ <App>           ← routes + Header/Footer shell
                 ├─ Home, Courses, About            (public)
                 ├─ Login, Register                 (guests only)
                 ├─ Account, CourseDescription,
                 │  CourseStudy                     (logged-in only)
                 └─ Admin                           (admin role only)
```

- **Route guarding** happens in `App.jsx`: guests are redirected to `/login`,
  non-admins are bounced from `/admin`. This is UX-level guarding — the server
  re-checks everything (§5), so the client can never be tricked into real access.
- **`api.js` is the single door to the backend.** One axios instance with
  `baseURL = VITE_SERVER + /api`, plus an interceptor that attaches the saved JWT to
  every request. Pages never build URLs by hand.
- **`mediaUrl()`** (also in `api.js`) resolves stored media references:
  absolute `https://…` (Cloudinary) URLs pass through untouched; dev paths like
  `uploads/x.jpg` get the API host prepended.
- **Styling** is plain CSS with **design tokens** in `App.css` (`:root` variables for
  colors, shadows, radii, fonts). Poppins for display/headings/buttons, Inter for body.
  Buttons and text use **solid colors** (gradients are reserved for large section
  backgrounds like the hero overlay and footer).

## 3. Backend anatomy

Request lifecycle — every API call passes through this chain:

```
Request
  → helmet (safe headers)
  → cors (only CLIENT_ORIGIN allowed)
  → express.json / multer (parse body or multipart file)
  → route handler chain:
       requireAuth?   verifies JWT, loads req.user        (middleware/auth.js)
       requireAdmin?  rejects non-admins                  (middleware/auth.js)
       storeUpload?   pushes file to Cloudinary or disk   (middleware/upload.js)
       handler        business logic + Mongoose queries   (routes/*.js)
  → errorHandler (uniform JSON errors)                    (middleware/errorHandler.js)
```

Route files map to concerns:

| File | Prefix | Concern |
| --- | --- | --- |
| `routes/auth.js` | `/api/auth` | register, login, current user |
| `routes/courses.js` | `/api/courses` | catalog, enrollment, lectures, progress |
| `routes/admin.js` | `/api/admin` | course/lecture CRUD + uploads, stats, users |

## 4. Data model

Four collections. Arrows are references (ObjectIds), not embedded documents.

```
User ────────────────────────┐
  name, email, passwordHash  │ subscription: [Course._id]   ← "what am I enrolled in"
  role: "user" | "admin"     │
                             ▼
Course                     Lecture
  title, description         title, description
  category, price            video    (URL)
  duration, createdBy        videoId  (Cloudinary id)
  image    (URL)             course ──► Course._id
  imageId  (Cloudinary id)

Progress                       ← "which lectures have I finished"
  user   ──► User._id
  course ──► Course._id
  completedLectures: [Lecture._id]
  UNIQUE INDEX on (user, course)   ← exactly one row per person per course
```

Design notes:

- **Progress is its own collection**, not a field on User — it keeps the user document
  small and makes the percentage math a simple lookup.
- The unique `(user, course)` index guarantees progress is **private and per-person**.
  Two users watching the same course each have their own 0–100%.
- Media fields store **URLs (strings), never file bytes**. `imageId`/`videoId` keep the
  Cloudinary public id so assets can be deleted from the CDN when a course/lecture is
  removed.

## 5. Authentication & roles (JWT, no sessions)

There is no server-side session store. Login state is a signed token the browser carries:

```
Login/Register
  → server verifies password (bcrypt compare against passwordHash)
  → signs JWT { sub: userId }, expiry 7d          (auth.js: signToken)
  → client saves it: localStorage["yb_token"]

Every subsequent request
  → axios interceptor adds  Authorization: Bearer <token>
  → requireAuth verifies signature, loads the user as req.user
  → requireAdmin (admin routes) additionally checks req.user.role === "admin"

Page refresh   → UserContext finds the saved token → GET /auth/me → still logged in
Logout         → delete the token from localStorage. That's all.
```

Roles change **access**, not data shape:

| Ability | user | admin |
| --- | --- | --- |
| Browse catalog | ✅ | ✅ |
| Enroll + watch enrolled lectures | ✅ | ✅ (no enrollment needed) |
| Create/delete courses & lectures | ❌ | ✅ |
| Stats & user list | ❌ | ✅ |

The lecture gate is one function — `hasAccess()` in `routes/courses.js`: you see a
course's lectures only if you're enrolled in it **or** you're an admin.

## 6. Media pipeline (images & videos)

The most important idea in the codebase: **files and metadata live in different places.**
MongoDB stores a URL string; the bytes live on Cloudinary (prod) or disk (dev). The
switch is automatic — if the three `CLOUDINARY_*` env vars exist, Cloudinary is used.

### Upload (admin creates a course / lecture)

```
Admin form (multipart, field "file")
  → multer (memory)          holds the file as a buffer, 200MB cap
  → storeUpload middleware
       prod: stream buffer to Cloudinary → { url: https://res.cloudinary.com/…, publicId }
       dev:  write buffer to server/uploads/<uuid>.<ext> → { url: "uploads/…" }
  → route saves url (+ publicId) on the Course/Lecture document
```

### Fetch (user watches a lecture)

```
GET /api/courses/:id/lectures  → JSON, each lecture has video: <url>
React: <video src={mediaUrl(lecture.video)} controls />
  prod: browser streams straight from the Cloudinary CDN  (zero API bandwidth)
  dev:  Express serves it via app.use("/uploads", express.static("uploads"))
```

### Delete

Deleting a lecture/course removes the DB rows **and** the media: by `publicId` on
Cloudinary, or `rm` on the dev file.

**Why not keep files on the API server in production?** Free hosts (Render etc.) have
*ephemeral* disks — every restart wipes them. A CDN also serves video far better than a
sleepy free dyno. See [DEPLOY.md](DEPLOY.md).

## 7. Key user flows

### Enroll → study → progress

```
1. Enroll      POST /courses/:id/enroll
               → course id pushed into user.subscription
               → empty Progress row created { completedLectures: [] }

2. Open course CourseStudy page loads lectures + progress in parallel
               → completed lecture ids render a ✓ tick

3. Complete    "Mark as complete" button
               → POST /courses/:id/progress { lectureId }
               → server pushes the id into completedLectures (idempotent)

4. Bar         GET /courses/:id/progress
               → percentage = completed / total lectures × 100   (computed live,
                 never stored — so adding a lecture later auto-adjusts everyone's %)
```

Completion is a **manual button** by design: nothing watches the `<video>` element, so
the button is the only "I finished this" signal. (Auto-complete would be a one-line
`onEnded={...}` handler on the player.)

### Admin creates content

```
Create course (title, price, … + cover image)  → POST /admin/courses
Add lectures  (title, description + video)     → POST /admin/courses/:id/lectures
Users see it instantly in the catalog; lectures stay locked until they enroll.
```

## 8. Configuration & environments

| Variable | Where | Purpose |
| --- | --- | --- |
| `MONGO_URI` | server | Mongo connection (local or Atlas) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | server | Token signing |
| `CLIENT_ORIGIN` | server | CORS allowlist (comma-separated ok) |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | server | Media CDN; **absent locally = disk fallback** |
| `VITE_SERVER` | client | API root URL (no `/api` suffix) |

The same codebase runs in both environments with **zero code changes** — behavior
switches purely on env vars.

## 9. Design decisions, briefly

| Decision | Why |
| --- | --- |
| JWT over sessions | Stateless → no session store → free hosting friendly; survives API restarts |
| Progress as own collection | Small user docs; unique index enforces one row per user+course |
| Percentage computed, not stored | Can't drift; adding lectures re-weights automatically |
| URLs in DB, files on CDN | Free-tier disks are ephemeral; CDNs stream video properly |
| Cloudinary optional in dev | Contributors run the app with zero external accounts |
| Free enrollment instead of Razorpay | Runs anywhere for free; `/enroll` is the hook to re-add payment |
| Plain CSS + tokens over a UI framework | Tiny bundle, full control, easy to theme (green+purple) |
