import { mkdir, lstat, readFile, writeFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { check, decode, EJSON, fail } from "./core.js";

// A single ignored location prevents accidental exports into tracked docs/tests.
export const PRIVATE_ROOT = fileURLToPath(new URL("../../.migration-private/", import.meta.url));
async function privateRoot() {
  await mkdir(PRIVATE_ROOT, { recursive: true, mode: 0o700 });
  const stat = await lstat(PRIVATE_ROOT);
  check(stat.isDirectory() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, "PRIVATE_DIRECTORY_PERMISSIONS_REQUIRED");
  check(await realpath(PRIVATE_ROOT) === path.resolve(PRIVATE_ROOT), "PRIVATE_DIRECTORY_SYMLINK_FORBIDDEN");
}
function safePath(name) {
  check(typeof name === "string" && /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(json|ejson)$/.test(name), "PRIVATE_ARTIFACT_FILENAME_REQUIRED");
  return path.join(PRIVATE_ROOT, name);
}
export async function writeArtifact(name, data) {
  await privateRoot();
  await writeFile(safePath(name), EJSON.stringify(data, null, 2, { relaxed: false }), { mode: 0o600, flag: "wx" });
}
export async function readArtifact(name) {
  try {
    await privateRoot();
    const file = safePath(name);
    const stat = await lstat(file);
    check(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o077) === 0, "PRIVATE_FILE_PERMISSIONS_REQUIRED");
    return decode(await readFile(file, "utf8"));
  } catch (error) {
    if (error.migrationCode) throw error;
    fail("ARTIFACT_UNREADABLE_OR_INVALID");
  }
}
