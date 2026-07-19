import { describe, expect, it } from "vitest";
import { renameMember } from "./rename-member";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("renameMember", () => {
	it("renomeia um membro existente", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		const renamed = await renameMember(
			repository,
			team.id,
			member.id,
			"Ana Souza",
		);
		expect(renamed.name).toBe("Ana Souza");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		await expect(
			renameMember(repository, team.id, member.id, " "),
		).rejects.toThrow("Nome do membro não pode ser vazio");
	});

	it("não renomeia membro de outro time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const otherTeam = await repository.create("Time B");
		const member = await repository.addMember(team.id, "Ana");

		await expect(
			renameMember(repository, otherTeam.id, member.id, "Ana Souza"),
		).rejects.toThrow("Membro não encontrado");
	});
});
