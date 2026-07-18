import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { addMember } from "./add-member";

describe("addMember", () => {
	it("adiciona um membro ao time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await addMember(repository, team.id, "Ana");
		expect(member.name).toBe("Ana");
		expect(member.teamId).toBe(team.id);
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		await expect(addMember(repository, team.id, " ")).rejects.toThrow(
			"Nome do membro não pode ser vazio",
		);
	});
});
