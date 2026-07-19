import { describe, expect, it } from "vitest";
import { createTeam } from "./create-team";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("createTeam", () => {
	it("cria um time com o nome informado", async () => {
		const repository = createFakeTeamRepository();
		const team = await createTeam(repository, "Time A");
		expect(team.name).toBe("Time A");
		expect(team.wipLimit).toBe(6);
		expect(await repository.listAll()).toEqual([team]);
	});

	it("cria um time com limite de WIP informado", async () => {
		const repository = createFakeTeamRepository();
		const team = await createTeam(repository, "Time A", 8);
		expect(team.wipLimit).toBe(8);
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		await expect(createTeam(repository, "   ")).rejects.toThrow(
			"Nome do time não pode ser vazio",
		);
	});

	it.each([0, -1, 1.5])("rejeita limite de WIP inválido: %s", async (limit) => {
		const repository = createFakeTeamRepository();
		await expect(createTeam(repository, "Time A", limit)).rejects.toThrow(
			"Limite de WIP deve ser um número inteiro positivo",
		);
	});
});
