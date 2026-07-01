import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// PUT /api/profile — update name and/or weekly goal.
router.put(
  "/",
  requireAuth,
  [
    body("name").optional().trim().notEmpty().isLength({ max: 80 }),
    body("weeklyGoalMinutes").optional().isInt({ min: 0, max: 10000 }).toInt(),
  ],
  validate,
  asyncHandler(async (req, res) => {
    const { name, weeklyGoalMinutes } = req.body;

    if (name !== undefined) req.user.name = name;
    if (weeklyGoalMinutes !== undefined) req.user.weeklyGoalMinutes = weeklyGoalMinutes;

    await req.user.save();
    res.json({ user: req.user.toPublicJSON() });
  })
);

export default router;
