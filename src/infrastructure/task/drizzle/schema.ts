import {
	boolean,
	date,
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
		dueDate: date("due_date"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at")
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("tasks_team_id_external_id_idx").on(
			table.teamId,
			table.externalId,
		),
	],
);

export const taskStatusChanges = pgTable("task_status_changes", {
	id: uuid("id").defaultRandom().primaryKey(),
	taskId: uuid("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	fromStatus: text("from_status"),
	toStatus: text("to_status").notNull(),
	changedAt: timestamp("changed_at").notNull().defaultNow(),
});

export const taskBlockedPeriods = pgTable("task_blocked_periods", {
	id: uuid("id").defaultRandom().primaryKey(),
	taskId: uuid("task_id")
		.notNull()
		.references(() => tasks.id, { onDelete: "cascade" }),
	blockedAt: timestamp("blocked_at").notNull().defaultNow(),
	unblockedAt: timestamp("unblocked_at"),
});
