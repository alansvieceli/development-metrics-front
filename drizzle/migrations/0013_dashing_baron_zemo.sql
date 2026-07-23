ALTER TABLE "tasks" ADD COLUMN "sprint_id" uuid;--> statement-breakpoint
CREATE INDEX "tasks_team_id_sprint_id_idx" ON "tasks" USING btree ("team_id","sprint_id");