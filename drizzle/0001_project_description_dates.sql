ALTER TABLE "projects" RENAME COLUMN "subtitle" TO "description";--> statement-breakpoint
ALTER TABLE "projects" RENAME COLUMN "year" TO "start_date";--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "end_date" text;--> statement-breakpoint
-- "year" held free text ("2025", "ongoing"); start_date holds months only, so
-- anything that isn't YYYY-MM is dropped rather than left to render wrong.
UPDATE "projects" SET "start_date" = NULL WHERE "start_date" !~ '^[0-9]{4}-(0[1-9]|1[0-2])$';
