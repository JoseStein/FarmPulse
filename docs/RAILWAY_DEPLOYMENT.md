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
SEED_OPERATOR_PASSWORD=<different-password-at-least-12-characters>
```

After the first successful deployment, run the seed once inside the deployed application container:

```bash
railway ssh -- npm run db:seed
```

Confirm the seed succeeds, sign in with both accounts, and then remove the two `SEED_*` variables. Running the seed again updates the development-account password hashes, so it must not be part of the automatic deploy command.

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
- Do not expose or reuse the local `ChangeMe123!` development password.
- Rotate `AUTH_SECRET` only with a planned logout window because existing sessions become invalid.

## Rollback

Railway can redeploy an earlier image, but application rollback does not reverse a database migration. Use backward-compatible migrations, restore PostgreSQL only from a verified backup when necessary, and coordinate any database rollback with the corresponding application version.
