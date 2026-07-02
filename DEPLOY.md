# 🚀 Deploying YogaBliss for free

> Companion docs: **[README.md](README.md)** (overview & quick start) ·
> **[ARCHITECTURE.md](ARCHITECTURE.md)** (how the system works)

The whole app runs on free tiers. Four services, deployed in this order:

```
1. MongoDB Atlas   → database        (users, courses, lecture metadata)
2. Cloudinary      → media           (course images + lecture videos, on a CDN)
3. Render          → backend API     (Express)
4. Vercel          → frontend        (React build)
```

**Why Cloudinary?** Free hosts (Render/Railway/Fly) wipe their disk on every restart,
so files uploaded by an admin would vanish. Cloudinary stores media permanently and
serves it from a CDN. The DB only keeps the URL; the browser fetches media straight
from Cloudinary (this also keeps traffic off the free Render dyno).

> Locally you don't need Cloudinary — if its keys are absent the app just saves uploads
> to `server/uploads/` on disk. Cloudinary only matters once deployed.

---

## 1. MongoDB Atlas (database)

1. Sign up at https://www.mongodb.com/atlas → create a **free M0** cluster.
2. **Database Access** → Add a database user (username + password). Save these.
3. **Network Access** → Add IP → **Allow access from anywhere** (`0.0.0.0/0`).
4. **Database → Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/yogabliss?retryWrites=true&w=majority
   ```
   Replace `<user>` / `<password>` and make sure `/yogabliss` is the db name.
   Keep this — it's your **`MONGO_URI`**.

## 2. Cloudinary (media storage)

1. Sign up at https://cloudinary.com (free "Programmable Media" plan, 25GB).
2. On the **Dashboard** copy three values:
   - **Cloud name** → `CLOUDINARY_CLOUD_NAME`
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

## 3. Push the code to GitHub

Render and Vercel deploy from a Git repo. If it isn't on GitHub yet:
```bash
git add .
git commit -m "Deploy-ready: Cloudinary media + polished UI"
git branch -M main
git remote add origin https://github.com/<you>/yogabliss.git
git push -u origin main
```

## 4. Render (backend API)

1. Sign up at https://render.com → **New +** → **Web Service** → connect your repo.
2. Settings:
   - **Root Directory:** `server`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
3. **Environment** → add these variables:

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `MONGO_URI` | *(from step 1)* |
   | `JWT_SECRET` | a long random string — generate with:<br>`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
   | `CLIENT_ORIGIN` | leave blank for now (set in step 5) |
   | `CLOUDINARY_CLOUD_NAME` | *(from step 2)* |
   | `CLOUDINARY_API_KEY` | *(from step 2)* |
   | `CLOUDINARY_API_SECRET` | *(from step 2)* |

   > `render.yaml` already lists these — a Render **Blueprint** deploy will prompt for them.
4. Deploy. When it's live, note the URL, e.g. `https://yogabliss-api.onrender.com`.
5. **Seed the demo data (once):** Render dashboard → your service → **Shell** →
   ```bash
   npm run seed
   ```
   Because Cloudinary keys are set, this uploads the demo images + sample video to the
   CDN and stores their URLs. Logins created: `admin@yogabliss.com / admin123` and
   `demo@yogabliss.com / demo123`.

## 5. Vercel (frontend)

1. Sign up at https://vercel.com → **Add New → Project** → import your repo.
2. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite (auto-detected)
3. **Environment Variables** → add:

   | Key | Value |
   | --- | --- |
   | `VITE_SERVER` | your Render URL, e.g. `https://yogabliss-api.onrender.com` (no trailing slash, no `/api`) |
4. Deploy. Note the URL, e.g. `https://yogabliss.vercel.app`.

## 6. Connect the two (CORS)

1. Back in **Render → Environment**, set:
   ```
   CLIENT_ORIGIN = https://yogabliss.vercel.app
   ```
   (your Vercel URL). Save — Render redeploys automatically.
2. Open your Vercel URL. Log in, browse courses, watch a lecture. Done. ✅

---

## Notes & gotchas

- **First request is slow.** Render's free service sleeps after ~15 min idle and takes
  ~30s to wake. Normal for the free tier.
- **Uploads now persist.** Admin-created courses/lectures upload to Cloudinary and
  survive restarts — unlike the old disk-based setup.
- **Video size.** Uploads are capped at 200MB (`server/src/middleware/upload.js`).
  Cloudinary's free video is generous but watch the 25GB/month bandwidth if it gets popular.
- **Secrets.** Never commit `.env`. All secrets live only in the Render/Vercel dashboards.
- **Custom domain.** Both Render and Vercel let you attach one free later.
