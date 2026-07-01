import { Router } from "express";
import { body } from "express-validator";
import User from "../models/User.js";
import { validate } from "../middleware/validate.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 80 }),
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: "email already in use" });
    }

    const user = new User({ name, email });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user._id);
    res.status(201).json({ token, user: user.toPublicJSON() });
  })
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // passwordHash has select:false, so request it explicitly.
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken(user._id);
    res.json({ token, user: user.toPublicJSON() });
  })
);

// GET /api/auth/me
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toPublicJSON() });
  })
);

export default router;
