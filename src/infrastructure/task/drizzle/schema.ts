import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

export const taskTypes = pgTable("task_types", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	color: text("color").notNull(),
});

export const tasks = pgTable(
	"tasks",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		externalId: text("external_id").notNull(),
		description: text("description").notNull(),
		typeId: uuid("type_id")
			.notNull()
			.references(() => taskTypes.id, { onDelete: "restrict" }),
		// assigneeId e teamId não têm FK: são ids de agregados do bounded
		// context `team`, e contextos não se acoplam a nível de schema.
		assigneeId: uuid("assignee_id"),
		teamId: uuid("team_id").notNull(),
		status: text("status").notNull(),
		blocked: boolean("blocked").notNull().default(false),
		dueDate: date("due_date").notNull(),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		check(
			"tasks_status_check",
			sql`${table.status} IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE')`,
		),
		uniqueIndex("tasks_team_id_external_id_idx").on(
			table.teamId,
			table.externalId,
		),
		index("tasks_team_id_status_idx").on(table.teamId, table.status),
		index("tasks_team_id_due_date_idx").on(table.teamId, table.dueDate),
	],
);

export const taskStatusChanges = pgTable(
	"task_status_changes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		fromStatus: text("from_status"),
		toStatus: text("to_status").notNull(),
		changedAt: timestamp("changed_at").notNull().defaultNow(),
	},
	(table) => [
		check(
			"task_status_changes_from_status_check",
			sql`${table.fromStatus} IS NULL OR ${table.fromStatus} IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE')`,
		),
		check(
			"task_status_changes_to_status_check",
			sql`${table.toStatus} IN ('TODO', 'IN_DEVELOPMENT', 'CODE_REVIEW', 'TESTING', 'AWAITING_PUBLICATION', 'DONE')`,
		),
		index("task_status_changes_task_id_changed_at_idx").on(
			table.taskId,
			table.changedAt,
		),
		index("task_status_changes_to_status_changed_at_idx").on(
			table.toStatus,
			table.changedAt,
		),
	],
);

export const taskBlockedPeriods = pgTable(
	"task_blocked_periods",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		taskId: uuid("task_id")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		blockedAt: timestamp("blocked_at").notNull().defaultNow(),
		unblockedAt: timestamp("unblocked_at"),
	},
	(table) => [
		index("task_blocked_periods_task_id_blocked_at_idx").on(
			table.taskId,
			table.blockedAt,
		),
	],
);
