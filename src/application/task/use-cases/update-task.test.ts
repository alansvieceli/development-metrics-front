import { describe, expect, it } from "vitest";
import { createFakeTagRepository } from "./test-helpers/create-fake-tag-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { updateTask } from "./update-task";

async function setup() {
	const repository = createFakeTaskRepository();
	const typeRepository = createFakeTaskTypeRepository();
	const type = await typeRepository.create("Bug", "#dc2626", true);
	const otherType = await typeRepository.create("Tarefa", "#64748b", false);
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
		dueDate: "2026-07-01",
		parentTaskId: null,
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
				parentTaskId: null,
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
			dueDate: "2026-07-01",
			parentTaskId: null,
		});
		await expect(
			updateTask(repository, typeRepository, teamAccess, "team-1", other.id, {
				externalId: "TASK-1",
				description: other.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: null,
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
		["data vazia", "team-1", { dueDate: "" }, "Data prevista é obrigatória"],
	] as const)("rejeita %s", async (_name, teamId, change, message) => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		await expect(
			updateTask(repository, typeRepository, teamAccess, teamId, task.id, {
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: null,
				...change,
			}),
		).rejects.toThrow(message);
	});

	it("vincula a uma task de origem do mesmo time", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		const parent = await repository.seed({
			externalId: "TASK-PAI",
			description: "Origem",
			typeId: type.id,
			assigneeId: null,
			teamId: "team-1",
			status: "TODO",
			dueDate: "2026-07-01",
			parentTaskId: null,
		});
		const updated = await updateTask(
			repository,
			typeRepository,
			teamAccess,
			"team-1",
			task.id,
			{
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: parent.id,
			},
		);
		expect(updated.parentTaskId).toBe(parent.id);
	});

	it("rejeita se tornar origem dela mesma", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		await expect(
			updateTask(repository, typeRepository, teamAccess, "team-1", task.id, {
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: task.id,
			}),
		).rejects.toThrow("Uma task não pode ser origem dela mesma");
	});

	it("rejeita task de origem inexistente", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		await expect(
			updateTask(repository, typeRepository, teamAccess, "team-1", task.id, {
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: "missing",
			}),
		).rejects.toThrow("Task de origem não encontrada");
	});

	it("substitui as tarjas da task", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		const tagRepository = createFakeTagRepository();
		const tag = await tagRepository.create("Cliente Acme", "#2563eb");
		await updateTask(
			repository,
			typeRepository,
			teamAccess,
			"team-1",
			task.id,
			{
				externalId: task.externalId,
				description: task.description,
				typeId: type.id,
				assigneeId: null,
				dueDate: "2026-07-01",
				parentTaskId: null,
				tagIds: [tag.id],
			},
			tagRepository,
		);
		expect(await repository.listTagIdsForTasks([task.id])).toEqual({
			[task.id]: [tag.id],
		});
	});

	it("rejeita mais de 3 tarjas", async () => {
		const { repository, typeRepository, teamAccess, task, type } =
			await setup();
		const tagRepository = createFakeTagRepository();
		const ids = await Promise.all(
			["A", "B", "C", "D"].map(async (name) => {
				const tag = await tagRepository.create(name, "#2563eb");
				return tag.id;
			}),
		);
		await expect(
			updateTask(
				repository,
				typeRepository,
				teamAccess,
				"team-1",
				task.id,
				{
					externalId: task.externalId,
					description: task.description,
					typeId: type.id,
					assigneeId: null,
					dueDate: "2026-07-01",
					parentTaskId: null,
					tagIds: ids,
				},
				tagRepository,
			),
		).rejects.toThrow("Uma task pode ter no máximo 3 tarjas");
	});
});
