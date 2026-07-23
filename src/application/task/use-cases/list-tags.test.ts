import { describe, expect, it } from "vitest";
import { createFakeTagRepository } from "./test-helpers/create-fake-tag-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { listTags } from "./list-tags";

describe("listTags", () => {
	it("marca o uso das tarjas com uma consulta independente do volume", async () => {
		const tagRepository = createFakeTagRepository();
		const taskRepository = createFakeTaskRepository();
		const used = await tagRepository.create("Cliente Acme", "#2563eb");
		await tagRepository.create("Urgente", "#dc2626");
		const task = await taskRepository.seed({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
			parentTaskId: null,
		});
		taskRepository.seedTagAssociation(task.id, used.id);

		const result = await listTags(tagRepository, taskRepository);

		expect(result.map((tag) => tag.inUse)).toEqual([true, false]);
	});
});
