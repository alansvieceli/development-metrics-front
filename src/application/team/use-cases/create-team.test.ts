import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { createTeam } from "./create-team";

describe("createTeam", () => {
	it("cria um time com o nome informado", async () => {
		const repository = createFakeTeamRepository();
		const team = await createTeam(repository, "Time A");
		expect(team.name).toBe("Time A");
		expect(await repository.listAll()).toEqual([team]);
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		await expect(createTeam(repository, "   ")).rejects.toThrow(
			"Nome do time não pode ser vazio",
		);
	});
});
