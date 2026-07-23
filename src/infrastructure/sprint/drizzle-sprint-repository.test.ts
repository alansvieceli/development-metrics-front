import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements, sprints } from "./drizzle/schema";
import { drizzleSprintRepository } from "./drizzle-sprint-repository";

const teamId = "00000000-0000-0000-0000-000000000003";

async function seedPi() {
	const [pi] = await db
		.insert(programIncrements)
		.values({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		})
		.returning();
	return pi;
}

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleSprintRepository", () => {
	it("cria uma sprint como PLANNED e busca por id", async () => {
		const pi = await seedPi();
		try {
			const created = await drizzleSprintRepository.create({
				piId: pi.id,
				teamId,
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			});
			expect(created.status).toBe("PLANNED");
			const found = await drizzleSprintRepository.findById(created.id);
			expect(found).toEqual(created);
		} finally {
			await deletePi(pi.id);
		}
	});

	it("lista as sprints de um pi", async () => {
		const pi = await seedPi();
		try {
			const created = await drizzleSprintRepository.create({
				piId: pi.id,
				teamId,
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			});
			const list = await drizzleSprintRepository.listByPi(pi.id);
			expect(list.map((s) => s.id)).toEqual([created.id]);
		} finally {
			await deletePi(pi.id);
		}
	});

	it("remove as sprints em cascata ao remover o pi", async () => {
		const pi = await seedPi();
		const created = await drizzleSprintRepository.create({
			piId: pi.id,
			teamId,
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await deletePi(pi.id);
		const [row] = await db.select().from(sprints).where(eq(sprints.id, created.id));
		expect(row).toBeUndefined();
	});
});
