import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { COURSES } from "../src/seed/catalog.js";
import { check, dryRun, execute, hash, inventory, prepare, snapshotHash, sourceChecksums, verifyBackup } from "./migration/core.js";
import { readArtifact, writeArtifact } from "./migration/artifacts.js";
import { connect } from "./migration/mongo.js";

export function parseOptions(args) {
  const { values } = parseArgs({ args, strict: true, allowPositionals: false, options: {
    "dry-run": { type: "boolean" }, inventory: { type: "boolean" }, prepare: { type: "boolean" },
    apply: { type: "boolean" }, rollback: { type: "boolean" }, help: { type: "boolean" },
    database: { type: "string" }, mapping: { type: "string" }, covers: { type: "string" },
    manifest: { type: "string" }, backup: { type: "string" }, approve: { type: "string" },
    "maintenance-confirmed": { type: "boolean" },
  } });
  const modes = ["dry-run", "inventory", "prepare", "apply", "rollback"].filter((m) => values[m]);
  check(modes.length <= 1, "CONFLICTING_MODES");
  return { ...values, mode: modes[0] || "dry-run" };
}
export async function main(args = process.argv.slice(2)) {
  const options = parseOptions(args);
  if (options.help) {
    console.log(`YogaBliss migration (defaults to read-only --dry-run)
Use MIGRATION_MONGO_URI or MONGO_URI from the environment; never pass credentials as arguments.
--database NAME is always required. No .env file is automatically loaded.
--inventory: read-only discovery; prints candidate course IDs and aggregate information.
--prepare --mapping FILE [--covers FILE]: read-only DB access; writes private backup + manifest.
--dry-run --manifest FILE --backup FILE: verifies plan and compares before/after database fingerprints.
--apply/--rollback --manifest FILE --backup FILE --approve MANIFEST_SHA256 --maintenance-confirmed
All artifact FILE arguments are basenames under server/.migration-private/ (ignored, private).
Apply/rollback require a transaction-capable deployment and an externally enforced write pause.
Phase 6B: apply/rollback are permitted ONLY in isolated tests, never against production.`);
    return;
  }
  let manifest, backup;
  const mutation = ["apply", "rollback"].includes(options.mode);
  if (options.manifest) {
    manifest = await readArtifact(options.manifest);
    backup = await readArtifact(options.backup);
    verifyBackup(manifest, backup);
  }
  if (mutation) check(manifest && options.approve === hash(manifest) && options["maintenance-confirmed"] && options.database === manifest.identity.database, "EXPLICIT_AUTHORIZATION_REQUIRED");
  if (options.mode === "dry-run") check(manifest, "MANIFEST_REQUIRED_USE_INVENTORY_FIRST");
  const checksums = sourceChecksums(await Promise.all(COURSES.map((c) => readFile(new URL(`../${c.image}`, import.meta.url)))));
  const mapping = options.mode === "prepare" ? await readArtifact(options.mapping) : null;
  const covers = options.covers ? await readArtifact(options.covers) : {};
  const adapter = await connect(process.env.MIGRATION_MONGO_URI || process.env.MONGO_URI, options.database);
  try {
    if (mutation) {
      console.log(JSON.stringify(await execute(adapter, options.mode, manifest, backup, checksums, { approve: options.approve, database: options.database, maintenance: options["maintenance-confirmed"] }), null, 2));
      return;
    }
    const before = await adapter.read();
    let result;
    if (options.mode === "inventory") result = inventory(before);
    else if (options.mode === "prepare") result = prepare(before, mapping, checksums, covers);
    else result = dryRun(before, manifest, backup, checksums);
    const after = await adapter.read();
    check(snapshotHash(before) === snapshotHash(after) && hash(before.journals) === hash(after.journals), "DATABASE_CHANGED_DURING_READ_ONLY_OPERATION");
    if (options.mode === "prepare") {
      const prefix = result.backup.id;
      const backupFile = `${prefix}.migration-backup.ejson`;
      const manifestFile = `${prefix}.migration-manifest.json`;
      await writeArtifact(backupFile, result.backup);
      await writeArtifact(manifestFile, result.manifest);
      // Read bytes back before claiming backup readiness.
      verifyBackup(await readArtifact(manifestFile), await readArtifact(backupFile));
      console.log(JSON.stringify({ status: "prepared-not-applied", backupFile, manifestFile, manifestChecksum: hash(result.manifest), databaseUnchanged: true, coverBlockers: dryRun(before, result.manifest, result.backup, checksums).blockers }, null, 2));
    } else {
      console.log(JSON.stringify({ ...result, databaseUnchanged: true }, null, 2));
    }
  } finally { await adapter.close(); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((error) => {
    // Driver errors may contain hosts, usernames or connection details. Never log them.
    console.error(`Migration stopped: ${error.migrationCode || "OPERATION_FAILED_CHECK_PRIVATE_CONFIGURATION"}`);
    process.exitCode = 1;
  });
}
