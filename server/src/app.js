import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import courseRoutes from "./routes/courses.js";
import adminRoutes from "./routes/admin.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  // Allow images/videos to load cross-origin (frontend and API are on different hosts).
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(express.json());

  const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());
  app.use(cors({ origin: origins, credentials: true }));

  if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

  // Serve uploaded course images and lecture videos.
  app.use("/uploads", express.static("uploads"));

  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/courses", courseRoutes);
  app.use("/api/admin", adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
