import express from "express";
import mongoose from "mongoose";
import { uploadsDirectory } from "./services/media.js";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import adminRoutes from "./routes/admin.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { maintenanceReadOnly } from "./config/env.js";
import { maintenanceWriteBlock } from "./middleware/maintenance.js";

export function createApp() {
  const app = express();
  const readOnly = maintenanceReadOnly();

  // Allow images/videos to load cross-origin (frontend and API are on different hosts).
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(compression()); // gzip JSON responses — matters on slow free-tier dynos

  // Render/Heroku sit behind a proxy; needed so rate limiting sees real client IPs.
  if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

  const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());
  app.use(cors({ origin: origins, credentials: true }));

  // Keep CORS/preflight available, but reject writes before parsing bodies,
  // authentication, rate limiting, multipart uploads or route handlers.
  app.use("/api", maintenanceWriteBlock(readOnly));
  app.use(express.json());

  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

  // Serve uploaded course images and lecture videos.
  app.use("/uploads", express.static(uploadsDirectory));

  app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({
      status: connected ? "ok" : "degraded", process: "running", database: connected ? "connected" : "disconnected",
    });
  });

  // Brute-force protection: 20 login/register attempts per 15 minutes per IP.
  // (Scoped to those two routes only — /auth/me runs on every page load.)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many attempts, please try again in 15 minutes" },
  });
  app.use(["/api/auth/login", "/api/auth/register"], authLimiter);

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
