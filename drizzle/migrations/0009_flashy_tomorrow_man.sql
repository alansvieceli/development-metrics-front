CREATE INDEX "tasks_type_id_idx" ON "tasks" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "tasks_assignee_id_idx" ON "tasks" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "members_team_id_idx" ON "members" USING btree ("team_id");