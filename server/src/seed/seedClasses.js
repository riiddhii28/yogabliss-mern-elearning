// Seeds the yoga class catalog. Run once after connecting Atlas:  npm run seed
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import YogaClass from "../models/YogaClass.js";

const CLASSES = [
  {
    name: "Morning Flow",
    level: "Beginner",
    durationMinutes: 20,
    focus: "Energy & mobility",
    description: "A gentle sun-salutation sequence to wake up the body and set intentions for the day.",
  },
  {
    name: "Gentle Hatha",
    level: "Beginner",
    durationMinutes: 30,
    focus: "Alignment & breath",
    description: "Slow-paced postures held with steady breathing — ideal for building a foundation.",
  },
  {
    name: "Vinyasa Flow",
    level: "Intermediate",
    durationMinutes: 45,
    focus: "Strength & flow",
    description: "Breath-linked movement that builds heat, balance, and full-body strength.",
  },
  {
    name: "Power Yoga",
    level: "Advanced",
    durationMinutes: 60,
    focus: "Stamina & core",
    description: "A vigorous, fitness-oriented practice with challenging holds and transitions.",
  },
  {
    name: "Yin & Restore",
    level: "Beginner",
    durationMinutes: 40,
    focus: "Deep stretch & recovery",
    description: "Long-held passive poses that target connective tissue and calm the nervous system.",
  },
  {
    name: "Ashtanga Primary",
    level: "Advanced",
    durationMinutes: 75,
    focus: "Discipline & endurance",
    description: "The traditional primary series — a set sequence that builds precision and stamina.",
  },
  {
    name: "Guided Meditation",
    level: "Beginner",
    durationMinutes: 15,
    focus: "Calm & focus",
    description: "A breath-and-body awareness session to reduce stress and sharpen focus.",
  },
  {
    name: "Balance & Core",
    level: "Intermediate",
    durationMinutes: 35,
    focus: "Stability & core",
    description: "Standing balances and core work to improve control and posture.",
  },
];

async function run() {
  await connectDB(process.env.MONGO_URI);
  await YogaClass.deleteMany({});
  await YogaClass.insertMany(CLASSES);
  console.log(`Seeded ${CLASSES.length} yoga classes.`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
