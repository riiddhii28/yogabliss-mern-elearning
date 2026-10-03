# Targeted catalog migration plan — NOT EXECUTED

This is the original migration plan. Phase 6B tooling and isolated fixture tests
are now implemented; see [MIGRATION_TOOLING.md](MIGRATION_TOOLING.md) for commands,
atomic execution, private backups and remaining release gates.
No production database has been inspected.
The existing `npm run seed` deletes collections and must not be used for migration.

## Preconditions and mapping

1. Schedule a short maintenance window that pauses enrollment, progress and admin
   writes. Rehearse the entire procedure against an isolated restored copy first.
2. With separate explicit authorization, inventory the target database read-only:
   course IDs, titles, images/public IDs, ordered lectures, subscriptions, progress,
   document versions and indexes. Identify the intended three courses by verified
   IDs; never match or delete broadly by a title/category alone.
3. Approve a manifest mapping each existing course ID to exactly one entry in
   `server/src/seed/catalog.js`. Confirm intended cover filenames against
   `MEDIA_SOURCES.md`. If a match is ambiguous, stop. Unrelated courses are excluded.
4. Verify the existing unique Progress index on `(user, course)`. Record any
   pre-existing duplicates for explicit reconciliation; do not drop collections
   or indexes automatically. Rotate the formerly published admin password and
   JWT secret separately from content migration.

## Backup and dry run

5. Take a recoverable database backup and export the exact affected Course,
   Lecture and Progress documents with their IDs, timestamps and versions.
   Include subscription references for verification; users/passwords must not be
   rewritten. Preserve these exports securely outside the repository.
6. Record a manifest/checksum of old media references and Cloudinary public IDs.
   Keep old media available throughout the rollback window.
7. A future standalone migration script must default to dry-run, require an
   explicit database identity and approved course-ID manifest, and print only
   counts/IDs and proposed changes, never credentials or personal data. It must
   refuse unknown IDs, unexpected versions or missing backups.

## Apply only after separate approval

8. Upload the three curated covers under fresh, non-overwriting Cloudinary IDs.
   Verify each upload before changing any course reference. Log only migration
   asset IDs; clean up unsuccessful unreferenced uploads safely.
9. Prepare three new written lessons per mapped course, with recorded, stable IDs
   so retries are idempotent. Validate all nine lessons against the current schema.
   No sample video references are attached.
10. Update each approved course in place, preserving its `_id` and consequently
    existing subscriptions. Set the exact catalog fields, free price, minute
    duration, outcomes, new cover and `lessonOrder`.
11. Replace only the explicitly inventoried old demo lessons for those courses.
    Do not leave old lessons alongside new ones: the current ordering function
    appends unlisted lessons. During maintenance, archive/export and remove the
    old mapped lesson documents only after replacement documents are validated.
    Do not use admin deletion here: it would remove rollback media.
12. Old video completions do not demonstrate completion of different written
    lessons. Default proposal: retain the user/course Progress document but clear
    completions referencing replaced demo lessons. Preserve valid references to
    any explicitly retained lessons. Obtain approval for that reset policy first.
    Do not manufacture completed lessons. Do not touch unrelated progress.

## Verify, release and rollback

13. Verify exact approved course IDs, three intended covers, nine written lessons,
    order, protected/public response shapes, enrollment references and recalculated
    progress. Compare user counts and user documents against backup. Exercise the
    public and admin flows in staging before releasing maintenance mode.
14. Keep a per-step journal. Multi-document work is not automatically atomic.
    On failure, stop writes and either resume from the verified journal or restore
    the affected Course/Lecture/Progress documents with original IDs. Never restore
    the entire database over unrelated new data. Post-release rollback needs a
    reviewed merge/reconciliation of writes made since maintenance ended.
15. Delete old media only after the rollback window and separate verification that
    no Course/Lecture references remain. Apply the existing shared-media checks.
    The rollback manifest must identify any newly uploaded assets for safe cleanup.

Readiness: code supports old documents, written lessons and explicit ordering.
Actual production ID mapping, backup validity, existing indexes, provider access,
progress-reset approval and staging rehearsal remain prerequisites, not verified facts.
