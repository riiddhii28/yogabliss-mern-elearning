import { httpError } from "../utils/httpError.js";

function text(value, label, max, required = true) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    throw httpError(422, `${label} is ${required ? "required and must be" : "limited to"} at most ${max} characters`);
  }
  return value.trim();
}
function integer(value, label, max) {
  if (!["string", "number"].includes(typeof value) || !String(value).trim() || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > max) {
    throw httpError(422, `${label} must be a whole number between 1 and ${max}`);
  }
  return Number(value);
}
export function courseFields(body = {}, existing) {
  let outcomes = body.learningOutcomes;
  if (typeof outcomes === "string") {
    try { outcomes = JSON.parse(outcomes); } catch { throw httpError(422, "Learning outcomes must be a list of text items"); }
  }
  if (!Array.isArray(outcomes) || outcomes.length < 1 || outcomes.length > 20) throw httpError(422, "Provide 1–20 learning outcomes");
  // Old courses can retain weeks when only metadata is edited; new courses use minutes.
  const unit = body.durationUnit || "minutes";
  if (unit !== "minutes" && !(existing?.durationUnit === "weeks" && unit === "weeks")) throw httpError(422, "Duration must use minutes");
  return {
    title: text(body.title, "Title", 160), description: text(body.description, "Description", 10000),
    category: text(body.category, "Category", 80), level: text(body.level, "Level", 80),
    createdBy: text(body.createdBy, "Instructor", 120),
    duration: integer(body.duration, "Duration", 100000), durationUnit: unit, price: 0,
    learningOutcomes: outcomes.map((value) => text(value, "Learning outcome", 400)),
  };
}
export function lessonFields(body = {}, existing, count) {
  const type = body.type;
  if (!["written", "video"].includes(type)) throw httpError(422, "Choose Written or Video");
  if (existing && type !== (existing.video ? "video" : "written")) throw httpError(422, "An existing lesson's type cannot be changed");
  return {
    title: text(body.title, "Title", 160),
    description: text(body.description ?? "", "Description", 10000, false),
    content: type === "written" ? text(body.content, "Written content", 60000) : (existing?.content || ""),
    durationMinutes: integer(body.durationMinutes, "Duration", 100000),
    position: integer(body.order, "Order", Math.max(1, count + (existing ? 0 : 1))), type,
  };
}
