import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { programIncrements, sprints } from "./drizzle/schema";
import { drizzleSprintTaskSnapshotRepository } from "./drizzle-sprint-task-snapshot-repository";

const teamId = "00000000-0000-0000-0000-000000000004";

async function seedSprint() {
	const [pi] = await db
		.insert(programIncrements)
		.values({
			teamId,
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		})
		.returning();
	const [sprint] = await db
		.insert(sprints)
		.values({
			piId: pi.id,
			teamId,
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		})
		.returning();
	return { pi, sprint };
}

async function deletePi(id: string) {
	await db.delete(programIncrements).where(eq(programIncrements.id, id));
}

describe("drizzleSprintTaskSnapshotRepository", () => {
	it("grava e lista snapshots de task de uma sprint", async () => {
		const { pi, sprint } = await seedSprint();
		try {
			await drizzleSprintTaskSnapshotRepository.createMany([
				{
					sprintId: sprint.id,
					taskId: "11111111-1111-1111-1111-111111111111",
					externalId: "TASK-1",
					description: "Corrigir bug de login",
					typeId: "22222222-2222-2222-2222-222222222222",
					assigneeId: null,
					statusAtFreeze: "CODE_REVIEW",
					carriedOver: true,
				},
			]);
			const list = await drizzleSprintTaskSnapshotRepository.listBySprint(
				sprint.id,
			);
			expect(list).toHaveLength(1);
			expect(list[0]).toMatchObject({
				externalId: "TASK-1",
				statusAtFreeze: "CODE_REVIEW",
				carriedOver: true,
			});
		} finally {
			await deletePi(pi.id);
		}
	});

	it("não falha ao gravar uma lista vazia", async () => {
		await expect(
			drizzleSprintTaskSnapshotRepository.createMany([]),
		).resolves.toBeUndefined();
	});
});
