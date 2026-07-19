import { describe, expect, it } from "vitest";
import { deleteTeam } from "./delete-team";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("deleteTeam", () => {
	it("remove o time do repositório", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const usage = {
			hasTasksForTeam: async () => false,
			hasTasksForAssignee: async () => false,
		};
		await deleteTeam(repository, usage, team.id);
		expect(await repository.findById(team.id)).toBeNull();
	});

	it("não remove time que possui tasks", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const usage = {
			hasTasksForTeam: async () => true,
			hasTasksForAssignee: async () => false,
		};

		await expect(deleteTeam(repository, usage, team.id)).rejects.toThrow(
			"Time possui tasks",
		);
		expect(await repository.findById(team.id)).toEqual(team);
	});
});
