# Railway deployment runbook

This repository deploys through the root `Dockerfile`. Railway runs the checked-in Prisma migrations as a pre-deploy command, starts Next.js from the image command, and considers the deployment healthy only when both the app and PostgreSQL respond.

## 1. Create the services

1. In Railway, create a project and add a PostgreSQL service.
2. Add an application service from `JoseStein/FarmPulse` and select the `main` branch.
3. Generate a public domain for the application service.
4. Keep PostgreSQL and the application in the same Railway project so `DATABASE_URL` uses private networking.

## 2. Configure application variables

Add these to the application service. If the database service is named something other than `Postgres`, update the reference name.

```dotenv
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SECRET=<at-least-32-random-bytes>
AUTH_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
WEATHER_PROVIDER=open-meteo
STORAGE_PROVIDER=s3
STORAGE_BUCKET=<private-bucket-name>
STORAGE_REGION=<region-or-auto>
STORAGE_ENDPOINT=<S3-compatible-endpoint-or-empty-for-AWS>
STORAGE_ACCESS_KEY_ID=<access-key>
STORAGE_SECRET_ACCESS_KEY=<secret-key>
STORAGE_FORCE_PATH_STYLE=false
```

Generate `AUTH_SECRET` locally with `openssl rand -base64 32`. Do not set `PORT`; Railway supplies it. Open-Meteo does not require `WEATHER_API_KEY`.

Production photo uploads intentionally fail unless `STORAGE_PROVIDER=s3`. Use a private AWS S3, Cloudflare R2, Railway Bucket, or another compatible bucket with least-privilege credentials. Set `STORAGE_FORCE_PATH_STYLE=true` only when the provider requires it.

## 3. Deploy and initialize data

Every deployment runs `npx prisma migrate deploy` in Railway's pre-deploy container. A failed migration prevents the new release from replacing the healthy release.

For a brand-new pilot database, temporarily add strong values for:

```dotenv
SEED_ADMIN_PASSWORD=<unique-password-at-least-12-characters>
INITIAL_ADMIN_EMAIL=<administrator-email>
```

The pre-deploy command automatically applies migrations and runs the idempotent structural initializer. It does not add demo tasks, costs, irrigation, stock, equipment, or weather. To run it manually:

```bash
railway ssh -- npm run db:initialize:production
```

`SEED_ADMIN_PASSWORD` is used only when the configured administrator does not exist; an existing password is never overwritten. Confirm the initial login, then remove `SEED_ADMIN_PASSWORD`. Never run `db:seed:development` against production.

### Clean an existing pilot database

Read [`PRODUCTION_DATA_CLEANUP.md`](PRODUCTION_DATA_CLEANUP.md). Always review a dry run, verify a recoverable Railway PostgreSQL backup, execute with all confirmations, and run the verifier afterward. Do not use `prisma migrate reset`.

## 4. Verify the deployment

- `https://<domain>/api/health` returns HTTP 200 with `database: "connected"`.
- An unauthenticated `/dashboard` request redirects to `/login`.
- Administrator and operator authentication both work.
- Operators are redirected away from administrator-only routes such as `/settings` and `/expenses`.
- Logout clears the session.
- Create a field note and refresh to confirm persistence.
- Upload a phone photo and confirm it remains available after a redeploy.
- Log irrigation and confirm the dashboard, map, and irrigation history update.
- Download an expense CSV as an administrator.

## 5. Production safeguards

- Enable PostgreSQL backups and test a restore before field use.
- Enable bucket versioning or retention and keep database and object-storage backups together.
- Review migration SQL before every production deployment.
- Keep one application replica while using the current in-process weather cache; PostgreSQL data remains safe with additional replicas.
- Configure Railway usage alerts and sensible resource limits.
- Use unique seed passwords, share user credentials privately, and remove the temporary `SEED_*` variables after seeding.
- Rotate `AUTH_SECRET` only with a planned logout window because existing sessions become invalid.

## Rollback

Railway can redeploy an earlier image, but application rollback does not reverse a database migration. Use backward-compatible migrations, restore PostgreSQL only from a verified backup when necessary, and coordinate any database rollback with the corresponding application version.
