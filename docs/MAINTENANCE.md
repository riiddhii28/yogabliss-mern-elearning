# Backend maintenance write block

`MAINTENANCE_READ_ONLY` is read when the backend starts. An absent value or the
literal `false` preserves normal behavior. The literal `true` blocks every API
method except GET, HEAD and OPTIONS, including registration, login, enrollment,
progress, admin changes and uploads. There is no administrator bypass. Empty
values, `1`, `yes`, uppercase variants and other strings fail startup validation.

Blocked requests receive HTTP 503 with:

```json
{ "message": "YogaBliss is temporarily read-only for maintenance." }
```

CORS runs first so allowed frontends can read the response and preflight remains
available. The gate then runs before JSON parsing, authentication, rate limiting,
multipart handling and all API routes. Public/authenticated GET routes and HEAD
requests retain normal authorization and error behavior. GET `/api/health` still
reports actual database readiness: 200 connected, 503 disconnected.

The gate does not stop direct database clients, already-running requests or
future mutations mistakenly implemented as GET handlers. Current API GET routes
are reads. Audit that invariant when adding routes. The frontend is not the
enforcement mechanism. No frontend maintenance page is required.

## Future operator procedure — not executed by Phase 6E

1. Review and explicitly authorize the backend release containing this gate.
   Coordinate Render/Vercel automatic deployment settings so a push cannot
   accidentally release unrelated changes. No commit/push/deploy is implied here.
2. Deploy the backend with maintenance absent or `false`. Verify normal public
   and authenticated reads and normal behavior using designated test accounts.
3. Set `MAINTENANCE_READ_ONLY=true` in Render's backend environment and restart/
   redeploy. This is a backend setting, not a Vercel/Vite variable. The repository
   blueprint defaults to `false`; do not let a subsequent blueprint sync or
   deployment silently reset the setting during the migration window.
4. Wait until every backend instance runs the configured release. Ensure old
   instances are gone and in-flight requests/uploads have finished. Pause admin
   activity, other database writers and deployment automation. The environment
   flag alone does not prove that earlier requests have drained.
5. Verify direct requests, including valid admin sessions, receive 503 for POST,
   PUT, PATCH and DELETE. Use deliberately invalid/non-mutating test payloads and
   nonexistent IDs where possible, so a misconfigured gate cannot alter real
   courses. Check auth, enrollment/progress, admin courses/lessons/reordering and
   malformed multipart uploads. Confirm the maintenance message, not an unrelated
   503. Test all reachable instances using provider controls; repeated requests
   through one load balancer alone do not establish complete coverage.
6. Verify GET/HEAD health, public reads, authenticated reads and OPTIONS still
   work. Verify real readiness, not merely that the process responds.
7. Only now recheck production state and refresh the private backup, reviewed
   manifest and read-only dry run as necessary. Existing Phase 6D artifacts can
   become stale while the live application remains writable. Never bypass a
   snapshot mismatch. Reuse the three verified covers; do not upload duplicates.
8. Only with separate explicit approval, run the scoped migration using the
   private manifest/backup and database identity. The maintenance flag does not
   authorize apply. Keep old media and rollback artifacts intact.
9. Verify database relationships, ordered curriculum, progress reset and deployed
   backend/frontend compatibility before restoring writes. The old frontend
   cannot properly display the new written lessons, so coordinate the frontend
   release while the backend write block remains enabled.
10. After verification and authorization, set the flag to `false`, restart, confirm
    every instance has switched, then run designated-account write smoke tests.
    Resume deployment automation only after the release is confirmed healthy.

## Current scope

Phase 6E implements and locally tests the gate. It does not set production
environment variables, change dashboards, deploy or migrate. Private `.env`,
backup and manifest files must stay ignored and untracked. Real transaction tests
may use only a uniquely named isolated test database, never `yogabliss`.
