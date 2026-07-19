import { describe, expect, it } from "vitest";
import { createTask } from "./create-task";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

const baseInput = {
	externalId: "TASK-1",
	description: "Corrigir bug de login",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

async function setup() {
	const repository = createFakeTaskRepository();
	const historyRepository = createFakeTaskHistoryRepository();
	const typeRepository = createFakeTaskTypeRepository();
	const type = await typeRepository.create("Bug", "#dc2626");
	const teamAccess = {
		teamExists: async (teamId: string) => ["team-1", "team-2"].includes(teamId),
		memberBelongsToTeam: async (memberId: string, teamId: string) =>
			memberId === "member-1" && teamId === "team-1",
	};
	return {
		repository,
		historyRepository,
		typeRepository,
		teamAccess,
		input: { ...baseInput, typeId: type.id },
	};
}

describe("createTask", () => {
	it("cria a task e grava o status inicial no histórico", async () => {
		const { repository, historyRepository, typeRepository, teamAccess, input } =
			await setup();
		const task = await createTask(
			repository,
			historyRepository,
			typeRepository,
			teamAccess,
			input,
		);

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
		const { repository, historyRepository, typeRepository, teamAccess, input } =
			await setup();
		await expect(
			createTask(repository, historyRepository, typeRepository, teamAccess, {
				...input,
				externalId: "  ",
			}),
		).rejects.toThrow("Id externo não pode ser vazio");
	});

	it("rejeita descrição vazia", async () => {
		const { repository, historyRepository, typeRepository, teamAccess, input } =
			await setup();
		await expect(
			createTask(repository, historyRepository, typeRepository, teamAccess, {
				...input,
				description: " ",
			}),
		).rejects.toThrow("Descrição não pode ser vazia");
	});

	it("rejeita id externo duplicado no mesmo time", async () => {
		const { repository, historyRepository, typeRepository, teamAccess, input } =
			await setup();
		await createTask(
			repository,
			historyRepository,
			typeRepository,
			teamAccess,
			input,
		);
		await expect(
			createTask(
				repository,
				historyRepository,
				typeRepository,
				teamAccess,
				input,
			),
		).rejects.toThrow(
			'Já existe uma task com o id externo "TASK-1" neste time',
		);
	});

	it("permite o mesmo id externo em times diferentes", async () => {
		const { repository, historyRepository, typeRepository, teamAccess, input } =
			await setup();
		await createTask(
			repository,
			historyRepository,
			typeRepository,
			teamAccess,
			input,
		);
		const task = await createTask(
			repository,
			historyRepository,
			typeRepository,
			teamAccess,
			{
				...input,
				teamId: "team-2",
			},
		);
		expect(task.teamId).toBe("team-2");
	});

	it.each([
		["time inexistente", { teamId: "team-3" }, "Time não encontrado"],
		[
			"tipo inexistente",
			{ typeId: "type-missing" },
			"Tipo de task não encontrado",
		],
		[
			"membro de outro time",
			{ assigneeId: "member-2" },
			"Membro não pertence ao time",
		],
		["data inexistente", { dueDate: "2026-02-31" }, "Data prevista inválida"],
	] as const)("rejeita %s", async (_name, change, message) => {
		const { repository, historyRepository, typeRepository, teamAccess, input } =
			await setup();
		await expect(
			createTask(repository, historyRepository, typeRepository, teamAccess, {
				...input,
				...change,
			}),
		).rejects.toThrow(message);
	});
});
