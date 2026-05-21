-- Drop unique constraint on days.date to allow multiple weeks with the same date
DROP INDEX IF EXISTS "days_date_key";
