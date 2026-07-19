import { describe, expect, it } from "vitest";
import { deleteTask } from "./delete-task";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";

describe("deleteTask", () => {
	it("remove a task do repositório", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
		});
		await deleteTask(repository, "team-1", task.id);
		expect(await repository.findById(task.id)).toBeNull();
	});

	it("não remove task de outro time", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
		});

		await expect(deleteTask(repository, "team-2", task.id)).rejects.toThrow(
			"Task não encontrada",
		);
		expect(await repository.findById(task.id)).toEqual(task);
	});
});
