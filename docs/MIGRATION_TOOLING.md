# Phase 6B migration tooling

Production migration has **not** been performed. The mutation rehearsal uses
fixtures, not a MongoDB server. No production credentials were available during
Phase 6B. Provider access, production mapping, Cloudinary verification, an actual
backup and a real transaction rehearsal remain outstanding.

## Commands and private configuration

Run commands from `server`. `npm run migration -- --help` is safe offline.
`npm run test:migration` runs the isolated rehearsal without network access.

The CLI reads `MIGRATION_MONGO_URI` (preferred) or `MONGO_URI` from the process
environment. It never accepts a URI as an argument, automatically loads `.env`,
imports application models, starts the application or calls `seed.js`.
Supply credentials through a private environment/session, not shell history.
Use a read-only database principal for inventory, prepare and dry-run.

All file arguments are **basenames** under `server/.migration-private/`.
That directory is ignored, mode 0700; artifacts must be mode 0600. Files are
created exclusively, never overwritten. Backups contain sensitive account data;
never print, commit or share them. Manifests omit account records and credentials
but remain private because they identify the target database and documents.

After production read access is separately configured:

```sh
npm run migration -- --inventory --database DATABASE_NAME
```

This reports candidate IDs, metadata/media, counts, indexes, duplicate progress
pairs, invalid completions and unrelated course IDs. Database identity combines
the explicit database name with a credential-free fingerprint of the connection
destination. Confirm the destination independently in the hosting dashboard.
Changing connection aliases changes the fingerprint and requires fresh review.

## Reviewed mapping

Titles only discover candidates. Place a reviewed array in private `mapping.json`:

```json
[
  {
    "target": "hatha-foundations",
    "courseId": "REVIEWED_EXISTING_COURSE_ID",
    "oldLectureIds": ["REVIEWED_OLD_LESSON_ID", "REVIEWED_OLD_LESSON_ID"],
    "reviewed": true,
    "oldMediaReviewed": true
  }
]
```

The real mapping must contain exactly three distinct courses and targets:
`hatha-foundations`, `vinyasa-flow-strength`, `mindful-meditation-breathwork`.
The illustrative placeholders above are intentionally invalid. Do not invent IDs
or set review flags before inspecting actual documents and old media.

The initial migration is deliberately limited to the unchanged old seed shape:
exact known course fields, two expected demo lessons per course, and one shared
video reference. Custom text, extra lessons, duplicate progress, missing indexes
or unexpected relationships abort. They require a separately reviewed plan;
there is no force/ignore safety switch.

## Covers

Optional private `covers.json` is keyed by the three target names. Each value is:

```json
{
  "url": "https://res.cloudinary.com/ACCOUNT/image/upload/FRESH_PUBLIC_ID.jpg",
  "publicId": "FRESH_PUBLIC_ID",
  "verified": true,
  "verifiedAt": "ISO_TIMESTAMP",
  "sourceChecksum": "SHA256_OF_APPROVED_LOCAL_JPEG"
}
```

These are **review attestations**, not automatic Cloudinary verification. A later
authorized operator must verify the uploaded asset belongs to the intended
account, is readable and matches the approved local cover before setting them.
The tool checks format, unique/fresh references, source checksums and explicit
attestation. It does not contact Cloudinary, upload or remove assets.
An absent/unverified cover permits preparation and a dry-run report, but blocks
apply. Preserve all old assets throughout the rollback window.

## Backup and dry run

With an externally enforced write pause and reviewed mapping:

```sh
npm run migration -- --prepare --database DATABASE_NAME --mapping mapping.json
# Add --covers covers.json only when verified references exist.
```

Prepare performs only database reads. It writes a uniquely named private
Extended JSON backup and manifest, then reads them back and verifies checksums.
The backup captures three courses, all their lectures, their Progress records,
enrolled users plus users referenced by that progress, indexes and inventory.
ObjectIds, timestamps and BSON large integers survive serialization.
The manifest includes stable new lesson IDs, old metadata/checksums/media,
catalog/source checksums, target identity, progress IDs, enrollment counts and
backup identity/checksum. No User records appear in the manifest.

```sh
npm run migration -- --dry-run --database DATABASE_NAME \
  --manifest GENERATED.migration-manifest.json \
  --backup GENERATED.migration-backup.ejson
```

Dry run reports field changes, lesson creations/retirements, progress removals,
unchanged subscriptions and outstanding cover checks. It defaults to read-only.
Missing manifest/backup fails before connecting. Every read-only mode compares
before/after document/index fingerprints and journal state. A mismatch aborts;
it may indicate another writer, not a write performed by this utility. This is
a point-in-time check, not proof against concurrent writes that revert themselves.

A backup's checksum proves integrity, not recovery readiness on the actual
deployment. Rehearse restore/apply/rollback on an isolated MongoDB replica set
or restored staging copy before authorizing production changes. An Atlas/provider
snapshot or `mongodump` is an additional recommended recovery layer.

## Apply and rollback — future authorized operation only

**Do not run these against production in Phase 6B.**

Both mutation modes require the same private manifest/backup, explicit database
name, `--approve` equal to the reported manifest checksum, and
`--maintenance-confirmed`. These flags are deliberate operator authorization,
not a substitute for actually blocking application writes.

```sh
npm run migration -- --apply --database DATABASE_NAME \
  --manifest GENERATED.migration-manifest.json \
  --backup GENERATED.migration-backup.ejson \
  --approve REVIEWED_MANIFEST_SHA256 --maintenance-confirmed

npm run migration -- --rollback --database DATABASE_NAME \
  --manifest GENERATED.migration-manifest.json \
  --backup GENERATED.migration-backup.ejson \
  --approve REVIEWED_MANIFEST_SHA256 --maintenance-confirmed
```

Apply rejects any data/index drift since preparation. It requires MongoDB
transaction support and uses a snapshot transaction with majority write concern.
There is no non-transactional fallback. No intermediate curriculum is exposed:
the three courses are updated in place, nine written lessons inserted, the exact
six old IDs removed and only those completion references cleared, atomically.
The adapter cannot write User documents. No admin deletion/media cleanup is used.

A journal in `yogabliss_catalog_migrations` is committed in the same transaction.
An identical subsequent apply detects the applied state and preserves new learner
progress. An unrecognized partial state aborts; it does not guess how to resume.
After rollback, a new migration requires a separately reviewed journal/reapply
procedure; this one-off tool deliberately refuses automatic reapplication.

Rollback restores original course/lecture/progress documents and removes only
the nine manifest IDs. It leaves User documents and unrelated records untouched.
It refuses changed target curriculum, new target progress or enrollment changes,
rather than overwriting activity after reopening the site. Profile edits and
unrelated new data are preserved. Do not replace a failed rollback with a broad
database restore: review post-release activity separately.

## Limits and release gates

- Fixture tests prove planner/transaction-contract behavior, not MongoDB server
  transaction permissions, topology, provider settings or transaction-size limits.
- Inventory reads the four small application collections, capped at 100,000 rows
  each. A larger database requires a separately scoped review. Data is held in
  memory but account records are never printed.
- No built-in maintenance switch is added. Block backend writes from existing
  clients as well as the frontend; confirm auto-deployment controls separately.
- Source images and the unchanged catalog must still match the manifest.
- No production mapping, backup, dry-run or Cloudinary state is certified by the
  fixture tests. Re-run the production preflight after all missing access is ready.
