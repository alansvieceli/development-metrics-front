import { describe, expect, it } from "vitest";
import { deleteTag } from "./delete-tag";
import { createFakeTagRepository } from "./test-helpers/create-fake-tag-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";

describe("deleteTag", () => {
	it("remove uma tarja que não está em uso", async () => {
		const tagRepository = createFakeTagRepository();
		const taskRepository = createFakeTaskRepository();
		const tag = await tagRepository.create("Cliente Acme", "#2563eb");
		await deleteTag(tagRepository, taskRepository, tag.id);
		expect(await tagRepository.findById(tag.id)).toBeNull();
	});

	it("rejeita excluir uma tarja em uso por uma task", async () => {
		const tagRepository = createFakeTagRepository();
		const taskRepository = createFakeTaskRepository();
		const tag = await tagRepository.create("Cliente Acme", "#2563eb");
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
		taskRepository.seedTagAssociation(task.id, tag.id);
		await expect(
			deleteTag(tagRepository, taskRepository, tag.id),
		).rejects.toThrow(
			"Não é possível excluir uma tarja que está em uso por tasks",
		);
	});
});
