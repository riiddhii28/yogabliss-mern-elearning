import { readdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const roots = ["../src/", "./"].map((relative) => fileURLToPath(new URL(relative, import.meta.url)));
const files = [];
for (const root of roots) {
  files.push(...(await readdir(root, { recursive: true })).filter((file) => file.endsWith(".js")).map((file) => root + file));
}
for (const file of files) execFileSync(process.execPath, ["--check", file]);
// Import the app factory, never index.js (which connects) or the destructive seed.
await import("../src/app.js");
await import("./migrate-catalog.js");
console.log(`Syntax passed for ${files.length} modules; application import passed without connecting to MongoDB.`);
