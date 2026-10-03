import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB } from "./config/db.js";
import { validateEnv } from "./config/env.js";

const PORT = process.env.PORT || 5000;

async function start() {
  try { validateEnv(); }
  catch (error) {
    // These messages contain configuration key names only, never their values.
    console.error("Invalid server configuration:", error.message);
    process.exit(1);
  }
  try {
    await connectDB(process.env.MONGO_URI);
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`YogaBliss API listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err.name === "MongooseServerSelectionError" ? "Database connection failed" : "Check server configuration and connectivity");
    process.exit(1);
  }
}

start();
