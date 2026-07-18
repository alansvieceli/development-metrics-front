CREATE TABLE "task_blocked_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"blocked_at" timestamp DEFAULT now() NOT NULL,
	"unblocked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_status_changes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"description" text NOT NULL,
	"type_id" uuid NOT NULL,
	"assignee_id" uuid,
	"team_id" uuid NOT NULL,
	"status" text NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"due_date" date,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_blocked_periods" ADD CONSTRAINT "task_blocked_periods_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_status_changes" ADD CONSTRAINT "task_status_changes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_type_id_task_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."task_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_team_id_external_id_idx" ON "tasks" USING btree ("team_id","external_id");