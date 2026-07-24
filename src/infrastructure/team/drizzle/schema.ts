import { sql } from "drizzle-orm";
import {
	check,
	index,
	integer,
	pgTable,
	text,
	uuid,
} from "drizzle-orm/pg-core";

export const teams = pgTable(
	"teams",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		wipLimit: integer("wip_limit").notNull().default(6),
		completedTaskLimit: integer("completed_task_limit").notNull().default(10),
		businessmapBoardId: text("businessmap_board_id"),
	},
	(table) => [
		check("teams_wip_limit_check", sql`${table.wipLimit} > 0`),
		check(
			"teams_completed_task_limit_check",
			sql`${table.completedTaskLimit} > 0`,
		),
	],
);

export const members = pgTable(
	"members",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		teamId: uuid("team_id")
			.notNull()
			.references(() => teams.id, { onDelete: "cascade" }),
	},
	(table) => [index("members_team_id_idx").on(table.teamId)],
);
