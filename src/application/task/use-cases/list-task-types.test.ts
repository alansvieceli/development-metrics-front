import { describe, expect, it } from "vitest";
import { listTaskTypes } from "./list-task-types";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

describe("listTaskTypes", () => {
	it("lista os tipos marcando quais estão em uso", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const bug = await taskTypeRepository.create("Bug", "#dc2626");
		const historia = await taskTypeRepository.create("História", "#2563eb");
		await taskRepository.seed({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: bug.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: null,
		});

		const result = await listTaskTypes(taskTypeRepository, taskRepository);

		expect(result.find((t) => t.id === bug.id)?.inUse).toBe(true);
		expect(result.find((t) => t.id === historia.id)?.inUse).toBe(false);
	});
});
