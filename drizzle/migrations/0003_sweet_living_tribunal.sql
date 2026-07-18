CREATE INDEX "task_blocked_periods_task_id_blocked_at_idx" ON "task_blocked_periods" USING btree ("task_id","blocked_at");--> statement-breakpoint
CREATE INDEX "task_status_changes_task_id_changed_at_idx" ON "task_status_changes" USING btree ("task_id","changed_at");--> statement-breakpoint
CREATE INDEX "task_status_changes_to_status_changed_at_idx" ON "task_status_changes" USING btree ("to_status","changed_at");--> statement-breakpoint
CREATE INDEX "tasks_team_id_status_idx" ON "tasks" USING btree ("team_id","status");--> statement-breakpoint
CREATE INDEX "tasks_team_id_due_date_idx" ON "tasks" USING btree ("team_id","due_date");