import { describe, expect, it } from "vitest";
import { deleteTeam } from "./delete-team";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("deleteTeam", () => {
	it("remove o time do repositório", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await deleteTeam(repository, team.id);
		expect(await repository.findById(team.id)).toBeNull();
	});
});
