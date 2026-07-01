import { Router } from "express";
import YogaClass from "../models/YogaClass.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET /api/classes?level=Beginner — public catalog.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.level) filter.level = req.query.level;

    const classes = await YogaClass.find(filter).sort({ level: 1, name: 1 });
    res.json({ classes });
  })
);

// GET /api/classes/:id
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const yogaClass = await YogaClass.findById(req.params.id);
    if (!yogaClass) return res.status(404).json({ error: "Class not found" });
    res.json({ class: yogaClass });
  })
);

export default router;
