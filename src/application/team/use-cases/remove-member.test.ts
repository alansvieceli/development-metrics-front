import { describe, expect, it } from "vitest";
import { removeMember } from "./remove-member";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("removeMember", () => {
	it("remove o membro do time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		const usage = {
			hasTasksForTeam: async () => false,
			hasTasksForAssignee: async () => false,
		};
		await removeMember(repository, usage, team.id, member.id);
		expect(await repository.listMembers(team.id)).toEqual([]);
	});

	it("não remove membro de outro time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const otherTeam = await repository.create("Time B");
		const member = await repository.addMember(team.id, "Ana");
		const usage = {
			hasTasksForTeam: async () => false,
			hasTasksForAssignee: async () => false,
		};

		await expect(
			removeMember(repository, usage, otherTeam.id, member.id),
		).rejects.toThrow("Membro não encontrado");
		expect(await repository.listMembers(team.id)).toEqual([member]);
	});

	it("não remove membro responsável por tasks", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		const usage = {
			hasTasksForTeam: async () => false,
			hasTasksForAssignee: async () => true,
		};

		await expect(
			removeMember(repository, usage, team.id, member.id),
		).rejects.toThrow("Membro é responsável por tasks");
		expect(await repository.listMembers(team.id)).toEqual([member]);
	});
});
