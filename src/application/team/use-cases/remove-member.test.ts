import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { removeMember } from "./remove-member";

describe("removeMember", () => {
	it("remove o membro do time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const member = await repository.addMember(team.id, "Ana");
		await removeMember(repository, member.id);
		expect(await repository.listMembers(team.id)).toEqual([]);
	});
});
