import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Verifies the Bearer token and attaches the user to req.user.
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (["JsonWebTokenError", "TokenExpiredError", "NotBeforeError"].includes(err.name)) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    // Database/service failures must not tell the client to discard a valid JWT.
    next(err);
  }
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// Must run after requireAuth. Blocks non-admins.
export async function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }
  try {
    // The historically published seed credential must not authorize destructive
    // access, including tokens issued before this protection was introduced.
    const admin = await User.findById(req.user._id).select("+passwordHash");
    if (!admin || admin.role !== "admin" || !admin.passwordHash || await admin.comparePassword("admin123")) {
      return res.status(403).json({ error: "Private admin credentials are required. Contact the site owner." });
    }
    next();
  } catch (error) { next(error); }
}
