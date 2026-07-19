ALTER TABLE "teams" ADD COLUMN "wip_limit" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_wip_limit_check" CHECK ("teams"."wip_limit" > 0);