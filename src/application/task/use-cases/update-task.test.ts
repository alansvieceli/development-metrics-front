import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { updateTask } from "./update-task";

async function setup() {
	const repository = createFakeTaskRepository();
	const typeRepository = createFakeTaskTypeRepository();
	const type = await typeRepository.create("Bug", "#dc2626");
	const otherType = await typeRepository.create("Tarefa", "#64748b");
	const teamAccess = {
		teamExists: async () => true,
		memberBelongsToTeam: async (memberId: string, teamId: string) =>
			memberId === "member-1" && teamId === "team-1",
	};
	const task = await repository.seed({
		externalId: "TASK-1",
		description: "Corrigir bug de login",
		typeId: type.id,
		assigneeId: null,
		teamId: "team-1",
		status: "TODO",
		dueDate: null,
	});
	return { repository, typeRepository, teamAccess, task, type, otherType };
}

describe("updateTask", () => {
	it("atualiza os campos editáveis", async () => {
		const { repository, typeRepository, teamAccess, task, otherType } =
			await setup();
		const updated = await updateTask(
			repository,
			typeRepository,
			teamAccess,
			"team-1",
			task.id,
			{
				externalId: "TASK-1",
				description: "Corrigir bug de login (revisado)",
				typeId: otherType.id,
				assigneeId: "member-1",
				dueDate: "2026-08-01",
			},
		);
		expect(updated.description).toBe("Corrigir bug de login (revisado)");
		expect(updated.typeId).toBe(otherType.id);
		expect(updated.assigneeId).toBe("member-1");
		expect(updated.dueDate).toBe("2026-08-01");
	});

	it("rejeita id externo duplicado no mesmo time", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		const other = await repository.seed({
			externalId: "TASK-2",
			description: task.description,
			typeId: type.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: null,
		});
		await expect(
			updateTask(repository, typeRepository, teamAccess, "team-1", other.id, {
				externalId: "TASK-1",
				description: other.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: null,
			}),
		).rejects.toThrow(
			'Já existe uma task com o id externo "TASK-1" neste time',
		);
	});

	it.each([
		["task de outro time", "team-2", {}, "Task não encontrada"],
		[
			"tipo inexistente",
			"team-1",
			{ typeId: "missing" },
			"Tipo de task não encontrado",
		],
		[
			"membro de outro time",
			"team-1",
			{ assigneeId: "member-2" },
			"Membro não pertence ao time",
		],
		[
			"data inexistente",
			"team-1",
			{ dueDate: "2026-02-31" },
			"Data prevista inválida",
		],
	] as const)("rejeita %s", async (_name, teamId, change, message) => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		await expect(
			updateTask(repository, typeRepository, teamAccess, teamId, task.id, {
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: null,
				...change,
			}),
		).rejects.toThrow(message);
	});
});
