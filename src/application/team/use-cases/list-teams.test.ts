import { describe, expect, it } from "vitest";
import { listTeams } from "./list-teams";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("listTeams", () => {
	it("lista todos os times cadastrados", async () => {
		const repository = createFakeTeamRepository();
		await repository.create("Time A");
		await repository.create("Time B");
		const teams = await listTeams(repository);
		expect(teams.map((t) => t.name)).toEqual(["Time A", "Time B"]);
	});

	it("retorna lista vazia quando não há times", async () => {
		const repository = createFakeTeamRepository();
		expect(await listTeams(repository)).toEqual([]);
	});
});
