import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import activityRoutes from "./routes/activities.js";
import classRoutes from "./routes/classes.js";
import profileRoutes from "./routes/profile.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(express.json());

  // Allow the configured frontend origin(s).
  const origins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());
  app.use(cors({ origin: origins, credentials: true }));

  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  // Health check (used by Render).
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));

  app.use("/api/auth", authRoutes);
  app.use("/api/activities", activityRoutes);
  app.use("/api/classes", classRoutes);
  app.use("/api/profile", profileRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
