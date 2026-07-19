import { describe, expect, it } from "vitest";
import { listTaskTypes } from "./list-task-types";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

describe("listTaskTypes", () => {
	it("marca o uso dos tipos com uma consulta independente do volume", async () => {
		const taskTypeRepository = createFakeTaskTypeRepository();
		const taskRepository = createFakeTaskRepository();
		const bug = await taskTypeRepository.create("Bug", "#dc2626");
		await taskTypeRepository.create("História", "#2563eb");
		const melhoria = await taskTypeRepository.create("Melhoria", "#16a34a");
		await taskRepository.seed({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: bug.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
			parentTaskId: null,
		});
		await taskRepository.seed({
			externalId: "TASK-2",
			description: "Melhorar fluxo",
			typeId: melhoria.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
			parentTaskId: null,
		});

		const result = await listTaskTypes(taskTypeRepository, taskRepository);

		expect(result.map((type) => type.inUse)).toEqual([true, false, true]);
		expect(taskRepository.listUsedTypeIdsCalls).toBe(1);
	});
});
