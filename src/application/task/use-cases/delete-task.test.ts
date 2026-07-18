import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { deleteTask } from "./delete-task";

describe("deleteTask", () => {
	it("remove a task do repositório", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId: "type-1",
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: null,
		});
		await deleteTask(repository, task.id);
		expect(await repository.findById(task.id)).toBeNull();
	});
});
