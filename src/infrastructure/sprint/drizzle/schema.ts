import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	jsonb,
	pgTable,
	text,
	uuid,
} from "drizzle-orm/pg-core";

export const programIncrements = pgTable(
	"program_increments",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		// teamId sem FK: contextos não se acoplam a nível de schema (mesmo
		// padrão de tasks.team_id em src/infrastructure/task/drizzle/schema.ts).
		teamId: uuid("team_id").notNull(),
		name: text("name").notNull(),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
	},
	(table) => [index("program_increments_team_id_idx").on(table.teamId)],
);

export const sprints = pgTable(
	"sprints",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		piId: uuid("pi_id")
			.notNull()
			.references(() => programIncrements.id, { onDelete: "cascade" }),
		teamId: uuid("team_id").notNull(),
		name: text("name").notNull(),
		startDate: date("start_date").notNull(),
		endDate: date("end_date").notNull(),
		status: text("status").notNull().default("PLANNED"),
	},
	(table) => [
		check(
			"sprints_status_check",
			sql`${table.status} IN ('PLANNED', 'ACTIVE', 'CLOSED')`,
		),
		index("sprints_pi_id_idx").on(table.piId),
		index("sprints_team_id_status_idx").on(table.teamId, table.status),
	],
);

export const sprintTaskSnapshots = pgTable(
	"sprint_task_snapshots",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		sprintId: uuid("sprint_id")
			.notNull()
			.references(() => sprints.id, { onDelete: "cascade" }),
		// taskId e typeId sem FK: referências ao contexto `task`, que não se
		// acopla a `sprint` a nível de schema (mesmo padrão de tasks.team_id).
		taskId: uuid("task_id").notNull(),
		externalId: text("external_id").notNull(),
		description: text("description").notNull(),
		typeId: uuid("type_id").notNull(),
		assigneeId: uuid("assignee_id"),
		statusAtFreeze: text("status_at_freeze").notNull(),
		carriedOver: boolean("carried_over").notNull().default(false),
	},
	(table) => [index("sprint_task_snapshots_sprint_id_idx").on(table.sprintId)],
);

export const sprintMetricsSnapshots = pgTable("sprint_metrics_snapshots", {
	sprintId: uuid("sprint_id")
		.primaryKey()
		.references(() => sprints.id, { onDelete: "cascade" }),
	metrics: jsonb("metrics").notNull(),
});
