import { describe, expect, it } from "vitest";
import { createSprint } from "./create-sprint";
import { createFakeProgramIncrementRepository } from "./test-helpers/create-fake-program-increment-repository";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";

async function seedPi(
	programIncrementRepository: ReturnType<
		typeof createFakeProgramIncrementRepository
	>,
	teamId = "team-1",
) {
	return programIncrementRepository.create({
		teamId,
		name: "PI 2026.3",
		startDate: "2026-07-01",
		endDate: "2026-09-30",
	});
}

describe("createSprint", () => {
	it("cria uma sprint planejada vinculada ao pi", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository);

		const sprint = await createSprint(
			sprintRepository,
			programIncrementRepository,
			{
				piId: pi.id,
				teamId: "team-1",
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			},
		);

		expect(sprint.name).toBe("Sprint 1");
		expect(sprint.status).toBe("PLANNED");
	});

	it("rejeita pi inexistente", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: "pi-inexistente",
				teamId: "team-1",
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("PI não encontrado");
	});

	it("rejeita pi de outro time", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository, "team-1");

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: pi.id,
				teamId: "team-2",
				name: "Sprint 1",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("PI não encontrado");
	});

	it("rejeita nome vazio", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository);

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: pi.id,
				teamId: "team-1",
				name: "  ",
				startDate: "2026-07-01",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("Nome da sprint não pode ser vazio");
	});

	it("rejeita data de término anterior ou igual à de início", async () => {
		const sprintRepository = createFakeSprintRepository();
		const programIncrementRepository = createFakeProgramIncrementRepository();
		const pi = await seedPi(programIncrementRepository);

		await expect(
			createSprint(sprintRepository, programIncrementRepository, {
				piId: pi.id,
				teamId: "team-1",
				name: "Sprint 1",
				startDate: "2026-07-14",
				endDate: "2026-07-14",
			}),
		).rejects.toThrow("Data de término deve ser posterior à data de início");
	});
});
