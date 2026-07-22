import { describe, expect, it } from "vitest";
import { createHistoricalTask } from "./create-historical-task";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

const baseInput = {
	externalId: "TASK-1",
	description: "Migrar dados legados",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	dueDate: "2026-07-01",
	parentTaskId: null,
};

async function setup() {
	const repository = createFakeTaskRepository();
	const typeRepository = createFakeTaskTypeRepository();
	const type = await typeRepository.create("Bug", "#dc2626", true);
	const teamAccess = {
		teamExists: async (teamId: string) => teamId === "team-1",
		memberBelongsToTeam: async (memberId: string, teamId: string) =>
			memberId === "member-1" && teamId === "team-1",
	};
	return {
		repository,
		typeRepository,
		teamAccess,
		input: { ...baseInput, typeId: type.id },
	};
}

describe("createHistoricalTask", () => {
	it("gera uma transição por etapa e usa a data da primeira como createdAt", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const task = await createHistoricalTask(
			repository,
			typeRepository,
			teamAccess,
			{
				...input,
				steps: [
					{ status: "TODO", date: "2026-07-01" },
					{ status: "CODE_REVIEW", date: "2026-07-05" },
					{ status: "DONE", date: "2026-07-08" },
				],
			},
		);

		expect(task.status).toBe("DONE");
		expect(task.createdAt).toEqual(new Date("2026-07-01T00:00:00Z"));
		expect(
			repository.statusChanges.map(({ fromStatus, toStatus }) => ({
				fromStatus,
				toStatus,
			})),
		).toEqual([
			{ fromStatus: null, toStatus: "TODO" },
			{ fromStatus: "TODO", toStatus: "CODE_REVIEW" },
			{ fromStatus: "CODE_REVIEW", toStatus: "DONE" },
		]);
	});

	it("permite pular etapas e parar sem chegar em DONE", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const task = await createHistoricalTask(
			repository,
			typeRepository,
			teamAccess,
			{
				...input,
				steps: [
					{ status: "TODO", date: "2026-07-01" },
					{ status: "TESTING", date: "2026-07-04" },
				],
			},
		);
		expect(task.status).toBe("TESTING");
	});

	it("rejeita lista de etapas vazia", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps: [],
			}),
		).rejects.toThrow("Informe ao menos uma etapa");
	});

	it("rejeita datas fora de ordem", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps: [
					{ status: "TODO", date: "2026-07-05" },
					{ status: "CODE_REVIEW", date: "2026-07-01" },
				],
			}),
		).rejects.toThrow("As datas das etapas devem estar em ordem crescente");
	});

	it("rejeita duas etapas seguidas com o mesmo status", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps: [
					{ status: "TODO", date: "2026-07-01" },
					{ status: "TODO", date: "2026-07-02" },
				],
			}),
		).rejects.toThrow("Duas etapas seguidas não podem ter o mesmo status");
	});

	it("reaproveita as validações de create-task (id externo duplicado)", async () => {
		const { repository, typeRepository, teamAccess, input } = await setup();
		const steps = [{ status: "TODO" as const, date: "2026-07-01" }];
		await createHistoricalTask(repository, typeRepository, teamAccess, {
			...input,
			steps,
		});
		await expect(
			createHistoricalTask(repository, typeRepository, teamAccess, {
				...input,
				steps,
			}),
		).rejects.toThrow(
			'Já existe uma task com o id externo "TASK-1" neste time',
		);
	});
});
