import { sql } from "drizzle-orm";
import { check, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const teams = pgTable(
	"teams",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		name: text("name").notNull(),
		wipLimit: integer("wip_limit").notNull().default(6),
	},
	(table) => [check("teams_wip_limit_check", sql`${table.wipLimit} > 0`)],
);

export const members = pgTable("members", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
});
