import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { deleteTaskType } from "./delete-task-type";

describe("deleteTaskType", () => {
	it("remove um tipo que não está em uso", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const taskType = await taskTypeRepository.create("Épico", "#2563eb");
		await deleteTaskType(taskTypeRepository, taskRepository, taskType.id);
		expect(await taskTypeRepository.findById(taskType.id)).toBeNull();
	});

	it("rejeita excluir um tipo em uso por uma task", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const taskType = await taskTypeRepository.create("Bug", "#dc2626");
		await taskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: taskType.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: null,
		});
		await expect(
			deleteTaskType(taskTypeRepository, taskRepository, taskType.id),
		).rejects.toThrow(
			"Não é possível excluir um tipo de task que está em uso por tasks",
		);
	});
});
