import { describe, expect, it } from "vitest";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createTask } from "./create-task";

const baseInput = {
	externalId: "TASK-1",
	description: "Corrigir bug de login",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("createTask", () => {
	it("cria a task e grava o status inicial no histórico", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await createTask(repository, historyRepository, baseInput);

		expect(task.externalId).toBe("TASK-1");
		expect(task.blocked).toBe(false);
		expect(historyRepository.statusChanges).toEqual([
			expect.objectContaining({
				taskId: task.id,
				fromStatus: null,
				toStatus: "TODO",
			}),
		]);
	});

	it("rejeita id externo vazio", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await expect(
			createTask(repository, historyRepository, {
				...baseInput,
				externalId: "  ",
			}),
		).rejects.toThrow("Id externo não pode ser vazio");
	});

	it("rejeita descrição vazia", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await expect(
			createTask(repository, historyRepository, {
				...baseInput,
				description: " ",
			}),
		).rejects.toThrow("Descrição não pode ser vazia");
	});

	it("rejeita id externo duplicado no mesmo time", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await createTask(repository, historyRepository, baseInput);
		await expect(
			createTask(repository, historyRepository, baseInput),
		).rejects.toThrow('Já existe uma task com o id externo "TASK-1" neste time');
	});

	it("permite o mesmo id externo em times diferentes", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		await createTask(repository, historyRepository, baseInput);
		const task = await createTask(repository, historyRepository, {
			...baseInput,
			teamId: "team-2",
		});
		expect(task.teamId).toBe("team-2");
	});
});
