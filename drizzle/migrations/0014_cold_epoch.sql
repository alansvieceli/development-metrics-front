CREATE TABLE "sprint_metrics_snapshots" (
	"sprint_id" uuid PRIMARY KEY NOT NULL,
	"metrics" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprint_task_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sprint_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"description" text NOT NULL,
	"type_id" uuid NOT NULL,
	"assignee_id" uuid,
	"status_at_freeze" text NOT NULL,
	"carried_over" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sprint_metrics_snapshots" ADD CONSTRAINT "sprint_metrics_snapshots_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_task_snapshots" ADD CONSTRAINT "sprint_task_snapshots_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sprint_task_snapshots_sprint_id_idx" ON "sprint_task_snapshots" USING btree ("sprint_id");