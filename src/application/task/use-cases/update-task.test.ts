import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { updateTask } from "./update-task";

const baseData = {
	externalId: "TASK-1",
	description: "Corrigir bug de login",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("updateTask", () => {
	it("atualiza os campos editáveis", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.create(baseData);
		const updated = await updateTask(repository, task.id, {
			externalId: "TASK-1",
			description: "Corrigir bug de login (revisado)",
			typeId: "type-2",
			assigneeId: "member-1",
			dueDate: "2026-08-01",
		});
		expect(updated.description).toBe("Corrigir bug de login (revisado)");
		expect(updated.typeId).toBe("type-2");
		expect(updated.assigneeId).toBe("member-1");
		expect(updated.dueDate).toBe("2026-08-01");
	});

	it("rejeita id externo duplicado no mesmo time", async () => {
		const repository = createFakeTaskRepository();
		await repository.create(baseData);
		const other = await repository.create({ ...baseData, externalId: "TASK-2" });
		await expect(
			updateTask(repository, other.id, { ...baseData, externalId: "TASK-1" }),
		).rejects.toThrow('Já existe uma task com o id externo "TASK-1" neste time');
	});

	it("permite manter o próprio id externo ao editar", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.create(baseData);
		const updated = await updateTask(repository, task.id, baseData);
		expect(updated.externalId).toBe("TASK-1");
	});
});
