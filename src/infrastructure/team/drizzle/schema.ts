import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
});

export const members = pgTable("members", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	teamId: uuid("team_id")
		.notNull()
		.references(() => teams.id, { onDelete: "cascade" }),
});
