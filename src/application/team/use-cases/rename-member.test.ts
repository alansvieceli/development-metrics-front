import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { renameMember } from "./rename-member";

describe("renameMember", () => {
	it("renomeia um membro existente", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		const renamed = await renameMember(repository, member.id, "Ana Souza");
		expect(renamed.name).toBe("Ana Souza");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		await expect(renameMember(repository, member.id, " ")).rejects.toThrow(
			"Nome do membro não pode ser vazio",
		);
	});
});
