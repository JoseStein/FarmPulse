-- Add a human-readable weather location and correct the pilot farm coordinates.
ALTER TABLE "Farm" ADD COLUMN "locationName" TEXT;

UPDATE "Farm"
SET
  "locationName" = 'El Cortezo, Coclé, Panama',
  "latitude" = 8.346170,
  "longitude" = -80.587052
WHERE "name" = 'FarmPulse Panama Pilot';

-- Snapshots collected with the former coordinates must not be used as fallback data.
DELETE FROM "WeatherSnapshot"
WHERE "farmId" IN (
  SELECT "id" FROM "Farm" WHERE "name" = 'FarmPulse Panama Pilot'
);
