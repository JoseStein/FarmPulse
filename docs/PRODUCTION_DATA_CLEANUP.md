# Production mock-data cleanup

This procedure preserves users, memberships, farm/field/sector structure, crop references, settings, and audit history. It never resets or drops PostgreSQL. The cleanup recognizes only the exact records created by the former pilot seed and stops if it finds unknown operational records or attachments.

## 1. Deploy the code first

The deployment applies the nullable planting-date migration and structural initializer. Confirm `/api/health` returns HTTP 200.

## 2. Find the farm ID and create a backup

Use Railway PostgreSQL data tools or Prisma Studio to copy the target `Farm.id`. Create a Railway database backup/snapshot, confirm its completion, retention, and restore instructions, and record the snapshot identifier outside application logs. Database backup does not replace object-storage versioning for photos.

## 3. Review the mandatory dry run

```bash
railway ssh -- npm run db:cleanup:mock -- --farm=<farm-uuid> --dry-run
```

The output lists exact deletion candidates, preserved structural counts, and unknown operational counts. Dry run is the default even if `--dry-run` is omitted. If any `unexpectedOperationalRecords` count is nonzero, do not execute: inspect and classify those rows first. The script also refuses execution when candidate records have attachments because object-store deletion needs separate review.

## 4. Execute once

```bash
railway ssh -- npm run db:cleanup:mock -- \
  --farm=<farm-uuid> \
  --execute \
  --production-confirmation=CLEAN_FARMPULSE_PRODUCTION \
  --backup-confirmed \
  --admin-email=<active-admin-email>
```

Execution validates the administrator’s active membership and commits the recognized deletions, crop reset, neutral sector state, and one summary audit record in a transaction. It never deletes users or memberships. Re-running is safe: recognized deletion counts become zero and the planning reset remains unchanged.

## 5. Verify

```bash
railway ssh -- npm run db:verify:production -- --farm=<farm-uuid>
```

Every check must be `true`: administrator, field, four sectors, active Planning/Land preparation cycle, empty planting/harvest/yield fields, and absence of known demo operations or irrigation events. Then visually confirm Dashboard, Crop cycle, Tasks, Irrigation, Expenses, Inventory, Equipment, Journal, Reports, Weather, Settings, login, logout, and password change.

Initial land-preparation tasks and the baseline condition note are intentionally not auto-created. Add them through the application after confirming real due dates and assignees; this avoids converting planning suggestions into misleading production records.
