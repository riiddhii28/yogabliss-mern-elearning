export function maintenanceReadOnly(env = process.env) {
  const value = env.MAINTENANCE_READ_ONLY;
  if (value === undefined || value === "false") return false;
  if (value === "true") return true;
  throw new Error("MAINTENANCE_READ_ONLY must be exactly true or false, or absent.");
}

export function validateEnv(env = process.env) {
  maintenanceReadOnly(env);
  const missing = ["MONGO_URI", "JWT_SECRET"].filter((key) => !env[key]?.trim());
  if (missing.length) throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  const cloudKeys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const configured = cloudKeys.filter((key) => env[key]?.trim());
  if ((configured.length && configured.length !== cloudKeys.length) ||
      (env.NODE_ENV === "production" && configured.length !== cloudKeys.length)) {
    throw new Error("Cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET. Local storage is only supported outside production.");
  }
  if (env.NODE_ENV === "production") {
    if (env.JWT_SECRET.trim().length < 32 || /replace_me|change_me|your[_-]?secret/i.test(env.JWT_SECRET)) {
      throw new Error("JWT_SECRET must be a non-placeholder secret of at least 32 characters in production.");
    }
    if (!env.CLIENT_ORIGIN?.trim()) throw new Error("CLIENT_ORIGIN is required in production.");
  }
  if (env.CLIENT_ORIGIN) {
    const valid = env.CLIENT_ORIGIN.split(",").every((value) => {
      const origin = value.trim();
      try {
        const url = new URL(origin);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && url.origin === origin;
      } catch { return false; }
    });
    if (!valid) throw new Error("CLIENT_ORIGIN must contain comma-separated HTTP(S) origins without paths, credentials or wildcards.");
  }
}
