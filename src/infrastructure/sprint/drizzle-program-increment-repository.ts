import { eq } from "drizzle-orm";
import type {
	CreateProgramIncrementData,
	ProgramIncrementRepository,
} from "@/application/sprint/ports/program-increment-repository";
import type { ProgramIncrement } from "@/domain/sprint/entities/program-increment";
import { db } from "@/infrastructure/db/client";
import { programIncrements } from "./drizzle/schema";

export const drizzleProgramIncrementRepository: ProgramIncrementRepository = {
	async create(data: CreateProgramIncrementData) {
		const [row] = await db.insert(programIncrements).values(data).returning();
		return row as ProgramIncrement;
	},
	async listByTeam(teamId) {
		const rows = await db
			.select()
			.from(programIncrements)
			.where(eq(programIncrements.teamId, teamId));
		return rows as ProgramIncrement[];
	},
	async findById(id) {
		const [row] = await db
			.select()
			.from(programIncrements)
			.where(eq(programIncrements.id, id));
		return (row as ProgramIncrement) ?? null;
	},
};
