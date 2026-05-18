-- home_alternative is stored inline in the workout_plans.weeks JSONB column.
-- No schema change needed — this migration is a no-op for sequential numbering.
SELECT 1;
