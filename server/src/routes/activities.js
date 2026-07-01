import { Router } from "express";
import { body } from "express-validator";
import Activity, { YOGA_TYPES } from "../models/Activity.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { computeStats } from "../services/stats.js";

const router = Router();

// All activity routes require auth.
router.use(requireAuth);

// GET /api/activities — current user's sessions, newest first.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const activities = await Activity.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(limit)
      .populate("yogaClass", "name level");
    res.json({ activities });
  })
);

// GET /api/activities/stats — totals, streak, weekly progress, daily series.
router.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const activities = await Activity.find({ user: req.user._id }).sort({ date: 1 });
    const stats = computeStats(activities, req.user.weeklyGoalMinutes);
    res.json({ stats });
  })
);

const activityValidators = [
  body("durationMinutes").isInt({ min: 1, max: 600 }).withMessage("Duration must be 1–600 minutes").toInt(),
  body("yogaType").optional().isIn(YOGA_TYPES).withMessage("Unknown yoga type"),
  body("date").optional().isISO8601().withMessage("Invalid date").toDate(),
  body("notes").optional().isLength({ max: 500 }),
  body("yogaClass").optional({ nullable: true }).isMongoId().withMessage("Invalid class id"),
];

// POST /api/activities — log a session.
router.post(
  "/",
  activityValidators,
  validate,
  asyncHandler(async (req, res) => {
    const { durationMinutes, yogaType, date, notes, yogaClass } = req.body;
    const activity = await Activity.create({
      user: req.user._id,
      durationMinutes,
      yogaType,
      notes,
      yogaClass: yogaClass || null,
      ...(date ? { date } : {}),
    });
    res.status(201).json({ activity });
  })
);

// PUT /api/activities/:id
router.put(
  "/:id",
  activityValidators,
  validate,
  asyncHandler(async (req, res) => {
    const activity = await Activity.findOne({ _id: req.params.id, user: req.user._id });
    if (!activity) return res.status(404).json({ error: "Activity not found" });

    const { durationMinutes, yogaType, date, notes, yogaClass } = req.body;
    if (durationMinutes !== undefined) activity.durationMinutes = durationMinutes;
    if (yogaType !== undefined) activity.yogaType = yogaType;
    if (date !== undefined) activity.date = date;
    if (notes !== undefined) activity.notes = notes;
    if (yogaClass !== undefined) activity.yogaClass = yogaClass || null;

    await activity.save();
    res.json({ activity });
  })
);

// DELETE /api/activities/:id
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const activity = await Activity.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!activity) return res.status(404).json({ error: "Activity not found" });
    res.json({ ok: true });
  })
);

export default router;
