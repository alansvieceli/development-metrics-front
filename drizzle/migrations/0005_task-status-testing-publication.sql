ALTER TABLE "tasks" DROP CONSTRAINT "tasks_status_check";--> statement-breakpoint
ALTER TABLE "task_status_changes" DROP CONSTRAINT "task_status_changes_from_status_check";--> statement-breakpoint
ALTER TABLE "task_status_changes" DROP CONSTRAINT "task_status_changes_to_status_check";--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_status_check" CHECK ("tasks"."status" IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE'));--> statement-breakpoint
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_from_status_check" CHECK ("task_status_changes"."from_status" IS NULL OR "task_status_changes"."from_status" IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE'));--> statement-breakpoint
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_to_status_check" CHECK ("task_status_changes"."to_status" IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE'));
