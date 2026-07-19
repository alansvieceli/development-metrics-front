import { describe, expect, it } from "vitest";
import { deleteTaskType } from "./delete-task-type";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

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
		await taskRepository.seed({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: taskType.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
			parentTaskId: null,
		});
		await expect(
			deleteTaskType(taskTypeRepository, taskRepository, taskType.id),
		).rejects.toThrow(
			"Não é possível excluir um tipo de task que está em uso por tasks",
		);
	});

	it("rejeita excluir o tipo Bug mesmo sem uso", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const bugType = await taskTypeRepository.seedType({
			name: "Bug",
			color: "#dc2626",
			isBug: true,
		});
		await expect(
			deleteTaskType(taskTypeRepository, taskRepository, bugType.id),
		).rejects.toThrow("O tipo Bug não pode ser excluído");
	});
});
