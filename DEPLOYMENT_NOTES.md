# 🚀 YogaBliss — Deployment Notes

A short, simple log of how we deployed YogaBliss for **free**, and the one problem we hit along the way.

---

## What we used (all free forever)

| Service | Role | Free tier |
|---|---|---|
| **MongoDB Atlas** | Database (users, courses, progress) | 512 MB, free forever |
| **Cloudinary** | Media (images + videos on a CDN) | 25 GB storage + 25 GB/mo bandwidth |
| **Render** | Backend API (Express) | Free (sleeps after 15 min idle) |
| **Vercel** | Frontend (React build) | 100 GB/mo bandwidth |

**Cost: $0/month.** No credit card needed for any of them.

---

## Steps we followed (in order)

### 1. MongoDB Atlas — database
- Created a free **M0** cluster (AWS / Mumbai).
- Added a database user (username + password).
- Set **Network Access** so the database is reachable.
- Copied the connection string and added `/yogabliss` as the db name → this became `MONGO_URI`.
- ✅ Tested the connection — worked.

### 2. Cloudinary — media storage
- Signed up, grabbed 3 values from the dashboard:
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- ✅ Tested the credentials — worked (Free plan, 0 MB used).

### 3. Render — backend API
- Code was already on GitHub.
- Used **New + → Blueprint** (Render read `render.yaml` automatically).
- Filled env vars: `MONGO_URI`, `JWT_SECRET`, the 3 Cloudinary values.
- Left `CLIENT_ORIGIN` **blank** (set it later, after Vercel).
- Clicked **Deploy Blueprint**.

### 4. Vercel — frontend *(next)*
- Import repo, set **Root Directory = `client`**.
- Add env var `VITE_SERVER` = the Render URL (no trailing slash, no `/api`).

### 5. Connect them *(final)*
- Back in Render, set `CLIENT_ORIGIN` = the Vercel URL.
- Render redeploys → app is live.

---

## ⚠️ The problem we hit (and the fix)

**Build succeeded, but the server crashed on startup with:**

```
Failed to start server: Could not connect to any servers in your
MongoDB Atlas cluster ... make sure your IP address is on your
Atlas cluster's IP whitelist.
```

### Why it happened
MongoDB Atlas only accepts connections from **whitelisted IP addresses**.
- Our **local test worked** because our home IP was allowed.
- But **Render's servers use different IPs**, which Atlas was blocking.

### The fix
In Atlas → **Network Access** → **Add IP Address** → enter:

```
0.0.0.0/0
```

This means "allow from anywhere" — required for free hosts like Render, whose
server IPs change and can't be predicted. Made it **permanent** (not temporary),
waited until it showed **Active**, then redeployed on Render.

✅ After that, the logs showed `MongoDB connected` and `YogaBliss API listening`.

---

## 💡 Lessons learned

- **A working local connection ≠ a working cloud connection** — the difference is
  IP whitelisting. Always set `0.0.0.0/0` in Atlas before deploying.
- **Test credentials early.** Verifying MongoDB + Cloudinary before touching Render
  meant we knew the crash wasn't a credentials problem — it saved guessing.
- **First request is slow (~30s)** on Render's free tier because it sleeps when idle.
  This is normal, not a bug.
- **Keep `CLIENT_ORIGIN` blank until the frontend exists**, then wire it up last.

---

*For the full step-by-step guide, see [DEPLOY.md](DEPLOY.md).*
