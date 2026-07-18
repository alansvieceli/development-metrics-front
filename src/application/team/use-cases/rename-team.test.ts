import { describe, expect, it } from "vitest";
import { renameTeam } from "./rename-team";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("renameTeam", () => {
	it("renomeia um time existente", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const renamed = await renameTeam(repository, team.id, "Time B");
		expect(renamed.name).toBe("Time B");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await expect(renameTeam(repository, team.id, " ")).rejects.toThrow(
			"Nome do time não pode ser vazio",
		);
	});
});
