import { describe, expect, it } from "vitest";
import { createProgramIncrement } from "./create-program-increment";
import { createFakeProgramIncrementRepository } from "./test-helpers/create-fake-program-increment-repository";

describe("createProgramIncrement", () => {
	it("cria um pi com nome e datas válidas", async () => {
		const repository = createFakeProgramIncrementRepository();
		const pi = await createProgramIncrement(repository, {
			teamId: "team-1",
			name: "PI 2026.3",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		expect(pi.name).toBe("PI 2026.3");
		expect(pi.startDate).toBe("2026-07-01");
		expect(pi.endDate).toBe("2026-09-30");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeProgramIncrementRepository();
		await expect(
			createProgramIncrement(repository, {
				teamId: "team-1",
				name: "   ",
				startDate: "2026-07-01",
				endDate: "2026-09-30",
			}),
		).rejects.toThrow("Nome do PI não pode ser vazio");
	});

	it("rejeita data de início inválida", async () => {
		const repository = createFakeProgramIncrementRepository();
		await expect(
			createProgramIncrement(repository, {
				teamId: "team-1",
				name: "PI 2026.3",
				startDate: "2026-13-40",
				endDate: "2026-09-30",
			}),
		).rejects.toThrow("Data de início inválida");
	});

	it("rejeita data de término anterior ou igual à de início", async () => {
		const repository = createFakeProgramIncrementRepository();
		await expect(
			createProgramIncrement(repository, {
				teamId: "team-1",
				name: "PI 2026.3",
				startDate: "2026-07-01",
				endDate: "2026-07-01",
			}),
		).rejects.toThrow("Data de término deve ser posterior à data de início");
	});
});
