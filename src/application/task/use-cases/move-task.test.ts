import { describe, expect, it } from "vitest";
import { moveTask } from "./move-task";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";

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
		const task = await repository.seed(baseData);

		const moved = await moveTask(
			repository,
			"team-1",
			task.id,
			"IN_DEVELOPMENT",
		);

		expect(moved.status).toBe("IN_DEVELOPMENT");
		expect(repository.statusChanges).toEqual([
			expect.objectContaining({
				taskId: task.id,
				fromStatus: "TODO",
				toStatus: "IN_DEVELOPMENT",
			}),
		]);
	});

	it("detecta transições de retrabalho (code review -> em desenvolvimento)", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed({
			...baseData,
			status: "CODE_REVIEW",
		});

		await moveTask(repository, "team-1", task.id, "IN_DEVELOPMENT");

		expect(repository.statusChanges).toEqual([
			expect.objectContaining({
				fromStatus: "CODE_REVIEW",
				toStatus: "IN_DEVELOPMENT",
			}),
		]);
	});

	it("detecta transições de retrabalho (concluído -> em desenvolvimento)", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed({ ...baseData, status: "DONE" });

		await moveTask(repository, "team-1", task.id, "IN_DEVELOPMENT");

		expect(repository.statusChanges).toEqual([
			expect.objectContaining({
				fromStatus: "DONE",
				toStatus: "IN_DEVELOPMENT",
			}),
		]);
	});

	it("não grava histórico ao mover para a mesma coluna", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed(baseData);

		await moveTask(repository, "team-1", task.id, "TODO");

		expect(repository.statusChanges).toEqual([]);
	});

	it("não move task de outro time", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed(baseData);

		await expect(
			moveTask(repository, "team-2", task.id, "DONE"),
		).rejects.toThrow("Task não encontrada");
		expect((await repository.findById(task.id))?.status).toBe("TODO");
	});
});
