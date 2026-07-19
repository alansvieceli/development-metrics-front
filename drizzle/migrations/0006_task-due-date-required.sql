UPDATE "tasks" t
SET "due_date" = COALESCE(
	(SELECT MIN(tsc."changed_at")::date FROM "task_status_changes" tsc WHERE tsc."task_id" = t."id" AND tsc."to_status" = 'DONE'),
	t."created_at"::date
)
WHERE t."due_date" IS NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "due_date" SET NOT NULL;
