CREATE TABLE "program_increments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pi_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'PLANNED' NOT NULL,
	CONSTRAINT "sprints_status_check" CHECK ("sprints"."status" IN ('PLANNED', 'ACTIVE', 'CLOSED'))
);
--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_pi_id_program_increments_id_fk" FOREIGN KEY ("pi_id") REFERENCES "public"."program_increments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "program_increments_team_id_idx" ON "program_increments" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "sprints_pi_id_idx" ON "sprints" USING btree ("pi_id");--> statement-breakpoint
CREATE INDEX "sprints_team_id_status_idx" ON "sprints" USING btree ("team_id","status");