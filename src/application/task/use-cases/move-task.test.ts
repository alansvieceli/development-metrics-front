import { describe, expect, it } from "vitest";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { moveTask } from "./move-task";

const baseData = {
	externalId: "TASK-1",
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("moveTask", () => {
	it("move a task e grava a transição no histórico", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		const moved = await moveTask(
			repository,
			historyRepository,
			task.id,
			"IN_DEVELOPMENT",
		);

		expect(moved.status).toBe("IN_DEVELOPMENT");
		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({
				taskId: task.id,
				fromStatus: "TODO",
				toStatus: "IN_DEVELOPMENT",
			}),
		]);
	});

	it("detecta transições de retrabalho (code review -> em desenvolvimento)", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create({ ...baseData, status: "CODE_REVIEW" });

		await moveTask(repository, historyRepository, task.id, "IN_DEVELOPMENT");

		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({
				fromStatus: "CODE_REVIEW",
				toStatus: "IN_DEVELOPMENT",
			}),
		]);
	});

	it("detecta transições de retrabalho (concluído -> em desenvolvimento)", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create({ ...baseData, status: "DONE" });

		await moveTask(repository, historyRepository, task.id, "IN_DEVELOPMENT");

		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({ fromStatus: "DONE", toStatus: "IN_DEVELOPMENT" }),
		]);
	});

	it("não grava histórico ao mover para a mesma coluna", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		await moveTask(repository, historyRepository, task.id, "TODO");

		expect(historyRepository.statusChanges).toEqual([]);
	});
});
