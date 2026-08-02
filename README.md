# FarmPulse

FarmPulse is a responsive agricultural operations application for a multi-lot farm in Panama. It gives remote administrators a clear view of production while letting field operators record work in a few taps.

The current release focuses on real crop-cycle workflows: today’s decisions, land preparation and design, field and irrigation sectors, tasks, crop-specific activity logs, weather context, costs, notes/issues, inventory, equipment, and curated crop guidance. Crops are selected independently for each production lot; labels such as corn and melon in the source land drawing are examples, not fixed assignments.

## Product tour

For a complete, role-aware explanation of every navigation blade and workflow, see the [FarmPulse user guide](docs/USER_GUIDE.md).

Screenshot placeholders for deployment documentation:

- `docs/screenshots/dashboard-mobile.png` — mobile daily dashboard
- `docs/screenshots/farm-map.png` — interactive four-sector field map
- `docs/screenshots/activity-log.png` — quick irrigation workflow
- `docs/screenshots/dashboard-desktop.png` — remote administrator view

## Architecture

- **UI:** Next.js App Router, React, TypeScript, Tailwind CSS, Lucide icons, native responsive SVG map
- **Server:** App Router route handlers and server actions with Zod input validation
- **Data:** PostgreSQL with Prisma ORM, UUID keys, decimal measurements/money, indexes, audit records, and soft deletion where records may need retention
- **Authentication:** Auth.js credentials provider, bcrypt password hashing, 12-hour signed JWT sessions, protected middleware, and server-side role/tenant checks
- **Weather:** cached Open-Meteo service with database snapshots and an offline saved-observation fallback
- **Storage:** private attachment route backed by S3-compatible object storage in production and local files only in development
- **PWA:** installable manifest, mobile safe-area navigation, and app icon. True offline synchronization is a future phase.

All operational screens now load farm-scoped PostgreSQL records. Server actions persist tasks, activities and irrigation, crop-cycle budgets and expenses, notes/issues, inventory usage and adjustments, equipment maintenance, crop-cycle changes, and settings. Dashboard, map, guide, weather fallback, and CSV reports are calculated from those records.

## Local setup

Requirements: Node.js 22+, npm, and either Docker Desktop or PostgreSQL 15+.

```bash
npm install
cp .env.example .env
openssl rand -base64 32
npm run db:start
npx prisma migrate dev
npm run db:seed:development
npm run dev
```

Replace the placeholder `AUTH_SECRET` in `.env` with the output from `openssl`. The included local database command uses port `5433` to avoid collisions with other PostgreSQL projects. Paste only executable commands into interactive zsh; a line beginning with `#` is treated as a command unless `interactivecomments` is enabled.

Open `http://localhost:3000`. The health endpoint is `/api/health`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | Strong random session-signing secret |
| `AUTH_URL` | Production | Canonical application URL |
| `WEATHER_PROVIDER` | No | Defaults to `open-meteo` |
| `WEATHER_API_KEY` | Provider dependent | Empty for Open-Meteo |
| `STORAGE_PROVIDER` | No | `local` in development; use an object-storage adapter in production |
| `STORAGE_BUCKET` | Cloud storage | Bucket/container name |
| `STORAGE_REGION` | S3 storage | Region, or `auto` for compatible providers |
| `STORAGE_ENDPOINT` | Compatible storage | Provider endpoint; omit for AWS S3 |
| `STORAGE_ACCESS_KEY_ID` | S3 storage | Object-storage access key |
| `STORAGE_SECRET_ACCESS_KEY` | S3 storage | Object-storage secret key |
| `STORAGE_FORCE_PATH_STYLE` | Compatible storage | Set `true` only when required by the provider |

Never commit `.env` files or live credentials.

## Database and seed data

```bash
npx prisma migrate deploy  # apply checked-in migrations
SEED_ADMIN_PASSWORD='a-unique-12+-character-password' \
npm run db:initialize:production # structural records only
npm run db:seed:development      # local demo data only
npx prisma studio          # optional local data browser
```

Production initialization is idempotent and creates only the administrator (when absent), farm, one production area, four sectors, crop-neutral reference stages, a Planning cycle with no selected crop or planting date, and irrigation-design settings. The development seed uses Corn as one example crop, adds demonstration operations, and refuses to run under `NODE_ENV=production` without an explicit dangerous override.

The administrator seed password is supplied only through an environment variable and is never displayed by the application. `SEED_OPERATOR_PASSWORD` is optional; without it, the sample operator is inactive. After the initial administrator signs in, real user accounts can be created under **Settings → Users and access**.

## Testing and quality

```bash
npm test
npm run typecheck
npm run build
```

Tests cover metric/U.S. conversions, budget math, irrigation rules, validation, permissions, and real PostgreSQL workflows for irrigation, task/activity linkage, expenses/budgets, issues, tenant isolation, weather fallback, CSV export, and duplicate prevention. `npm test` expects the seeded local database to be reachable.

## Weather

The default service uses Open-Meteo and requires no key. Weather snapshots use the configured El Cortezo coordinates. If live retrieval fails, the application uses the latest saved live snapshot or shows an unavailable state; it does not invent fixture weather.

To add another provider, keep its response behind the same weather service/route contract and select it through `WEATHER_PROVIDER`.

## File storage

Development uploads are written under `public/uploads` after MIME, size, and safe-key validation. Production intentionally rejects local storage: set `STORAGE_PROVIDER=s3` and the S3-compatible variables above. PostgreSQL stores only attachment metadata and generated object keys; authenticated, farm-scoped routes serve images.

The upload route accepts JPEG, PNG, WebP, HEIC, and HEIF images up to 8 MB, generates UUID object keys, checks farm membership, and associates each image with a field note.

## Roles and data behavior

- Administrators can manage tasks, financial records, inventory catalog, equipment, crop cycles, reports, and farm settings.
- Operators can run field workflows: tasks, irrigation, activities, weather, journal/issues, map, and guide. Server checks remain authoritative even if a control is hidden.
- The farm unit preference changes displayed area, water, pressure, flow, rainfall, temperature, and wind on key operational screens. PostgreSQL values remain metric.
- Important multi-record writes use transactions and audit logs. Expense and journal history use soft deletion where supported.

Development seed passwords are supplied through `SEED_ADMIN_PASSWORD` and optional `SEED_OPERATOR_PASSWORD`; they are never stored in source. Production administrators can create individual accounts and every user can change their own password in Settings.

## Backups and known limitations

Enable scheduled PostgreSQL backups and object-storage versioning before field use; both are required to reconstruct a complete journal. Test restore procedures before the crop cycle starts. CSV is the current portable report format.

Known pilot limitations: one active field/cycle is selected automatically, the map assumes the preserved four-sector layout, histories are capped at 100 rows per screen/export, no offline synchronization is available, guide review/dismiss state is not persisted, notifications are not yet configurable, revenue is not modeled (profitability remains unavailable), and PDF reports are not implemented.

## Railway deployment

The complete step-by-step setup and verification procedure is in [`docs/RAILWAY_DEPLOYMENT.md`](docs/RAILWAY_DEPLOYMENT.md).

1. Create a Railway project with PostgreSQL and this GitHub repository.
2. Set `DATABASE_URL=${{Postgres.DATABASE_URL}}`, a generated `AUTH_SECRET`, the HTTPS `AUTH_URL`, and S3-compatible storage variables.
3. Railway uses the Dockerfile and runs `npx prisma migrate deploy` as a pre-deploy command.
4. Supply a one-time `SEED_ADMIN_PASSWORD`; pre-deploy runs the structural production initializer and never the demo seed.
5. Confirm `/api/health` reports a connected database, then verify both roles, logout, persistence, weather, uploads, and exports.

The Docker image runs as a non-root user. For an internet-facing deployment, change the seeded passwords first and connect persistent object storage.

### Production checklist

- Generate a unique `AUTH_SECRET`; set unique one-time production seed passwords and restrict seed execution.
- Use managed PostgreSQL with automated backups, retention, connection limits, and a tested restore.
- Configure private S3-compatible storage, least-privilege credentials, encryption, retention, and CORS if required.
- Apply `npx prisma migrate deploy` before startup and review migration backups before each release.
- Set the canonical HTTPS `AUTH_URL`; verify secure cookies, `/api/health`, both roles, logout, and protected/admin routes.
- Run `npm audit`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` in CI.
- Verify weather fallback, CSV exports, phone photo uploads, responsive layouts, and persistence after refresh in staging.
- Keep `.env`, database dumps, and object-storage credentials out of Git and application logs.

## Security notes

- Route middleware requires authentication; APIs and server actions also verify sessions.
- Role checks are not limited to UI visibility. Operators cannot manage settings or mutate protected financial administration.
- Farm membership is checked before scoped writes to prevent cross-farm access.
- Passwords use bcrypt cost 12; secrets are environment-only.
- Zod validates form payloads. Safe messages avoid leaking database details.
- Important writes create `AuditLog` records.
- Soft deletion preserves expense, field, inventory, and journal history where appropriate.
- Auth.js session/cookie handling provides CSRF-aware authentication flows. Keep dependencies patched and review `npm audit` before releases.

## Roadmap

- Offline draft queue and conflict-aware synchronization
- Image resizing and thumbnail generation
- Spanish localization
- Push/email reminders
- Soil-moisture sensor input
- More crops and farms
- PDF reports and full integration/E2E coverage

FarmPulse guidance is educational decision support. Confirm pesticide labels, local regulations, and important treatment decisions with a qualified agricultural professional in Panama.
