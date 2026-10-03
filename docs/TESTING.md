# Local verification

Use Node 20 (the version used by CI), then from the repository root:

```sh
npm ci --prefix server
npm ci --prefix client
npm test --prefix server
npm run check --prefix server
npm test --prefix client
npm run build --prefix client
git diff --check
```

No `.env`, MongoDB installation, production credentials or Cloudinary account is
needed. Never run the seed as part of verification.

Backend tests use Node's test runner, real Express HTTP routes on an ephemeral
loopback port, and real Mongoose casting/validation/password hashing. A small
collection fixture implements only the database operations exercised by the tests;
Cloudinary calls are stubbed. MongoDB connection methods throw if called. This
checks route/service integration, not MongoDB's actual concurrency/index behavior.
The fixture uses synthetic accounts and unmanaged or mocked media URLs, not local
course assets. Tests do not initialize the normal server entry point.

Frontend tests use Node's test runner, the existing Vite JSX loader, and the React
18-matched test renderer. React hooks, context and in-memory routing are real;
Axios responses and localStorage are isolated fixtures. No browser or DOM layout
is simulated. The suite tests behavior, not snapshots of visual markup.

CI installs lockfile versions and runs these tests, the backend syntax/import
check, and the frontend production build. Build output and local test output stay
ignored. Tests need permission to listen on localhost; restricted sandboxes may
require approval for the backend test command.

Before deployment, separately verify in a real browser at 320px, 375px, 768px and
desktop widths, and rehearse against isolated real MongoDB/Cloudinary resources.
These checks do not replace those integration and visual checks. See
[MIGRATION_PLAN.md](MIGRATION_PLAN.md) before any future data migration.
