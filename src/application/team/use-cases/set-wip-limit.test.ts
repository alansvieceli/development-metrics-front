import { describe, expect, it } from "vitest";
import { setWipLimit } from "./set-wip-limit";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("setWipLimit", () => {
	it("altera o limite de WIP do time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");

		const updated = await setWipLimit(repository, team.id, 9);

		expect(updated.wipLimit).toBe(9);
	});

	it.each([0, -1, 1.5])("rejeita limite inválido: %s", async (limit) => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");

		await expect(setWipLimit(repository, team.id, limit)).rejects.toThrow(
			"Limite de WIP deve ser um número inteiro positivo",
		);
	});
});
