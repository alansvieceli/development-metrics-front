import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { taskStatusChanges, tasks } from "./drizzle/schema";
import { drizzleTaskHistoryRepository } from "./drizzle-task-history-repository";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";

describe("drizzleTaskHistoryRepository", () => {
	let typeId: string;

	beforeEach(async () => {
		typeId = (await drizzleTaskTypeRepository.create("Bug", "#dc2626", true))
			.id;
	});

	afterEach(async () => {
		await db.delete(tasks);
		await drizzleTaskTypeRepository.delete(typeId);
	});

	it("retorna a data da mudança de status mais recente de cada task", async () => {
		const [task] = await db
			.insert(tasks)
			.values({
				externalId: "TASK-1",
				description: "Corrigir bug",
				typeId,
				assigneeId: null,
				teamId: "11111111-1111-1111-1111-111111111111",
				status: "IN_DEVELOPMENT",
				dueDate: "2026-07-01",
			})
			.returning();
		const initial = new Date("2026-07-17T10:00:00Z");
		const latest = new Date("2026-07-18T10:00:00Z");
		await db.insert(taskStatusChanges).values([
			{
				taskId: task.id,
				fromStatus: null,
				toStatus: "TODO",
				changedAt: initial,
			},
			{
				taskId: task.id,
				fromStatus: "TODO",
				toStatus: "IN_DEVELOPMENT",
				changedAt: latest,
			},
		]);

		expect(
			await drizzleTaskHistoryRepository.getStatusChangedAtForTasks([task.id]),
		).toEqual({ [task.id]: latest });
	});

	it("não consulta o banco quando não há ids", async () => {
		expect(
			await drizzleTaskHistoryRepository.getStatusChangedAtForTasks([]),
		).toEqual({});
	});
});
