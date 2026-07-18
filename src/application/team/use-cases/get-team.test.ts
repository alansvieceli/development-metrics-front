import { describe, expect, it } from "vitest";
import { getTeam } from "./get-team";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("getTeam", () => {
	it("retorna o time com seus membros", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await repository.addMember(team.id, "Ana");
		const result = await getTeam(repository, team.id);
		expect(result?.team).toEqual(team);
		expect(result?.members.map((m) => m.name)).toEqual(["Ana"]);
	});

	it("retorna null quando o time não existe", async () => {
		const repository = createFakeTeamRepository();
		expect(await getTeam(repository, "inexistente")).toBeNull();
	});
});
