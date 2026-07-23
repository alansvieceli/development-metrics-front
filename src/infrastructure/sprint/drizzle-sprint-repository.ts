import { eq } from "drizzle-orm";
import type {
	CreateSprintData,
	SprintRepository,
} from "@/application/sprint/ports/sprint-repository";
import type { Sprint, SprintStatus } from "@/domain/sprint/entities/sprint";
import { db } from "@/infrastructure/db/client";
import { sprints } from "./drizzle/schema";

function toSprint(row: typeof sprints.$inferSelect): Sprint {
	return { ...row, status: row.status as SprintStatus };
}

export const drizzleSprintRepository: SprintRepository = {
	async create(data: CreateSprintData) {
		const [row] = await db.insert(sprints).values(data).returning();
		return toSprint(row);
	},
	async listByPi(piId) {
		const rows = await db.select().from(sprints).where(eq(sprints.piId, piId));
		return rows.map(toSprint);
	},
	async listByTeam(teamId) {
		const rows = await db.select().from(sprints).where(eq(sprints.teamId, teamId));
		return rows.map(toSprint);
	},
	async findById(id) {
		const [row] = await db.select().from(sprints).where(eq(sprints.id, id));
		return row ? toSprint(row) : null;
	},
};
