import { describe, expect, it } from "vitest";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";
import { getCurrentTeam } from "./get-current-team";

function createFakeCurrentTeamStore(initial: string | null): CurrentTeamStore {
	let value = initial;
	return {
		async get() {
			return value;
		},
		async set(teamId) {
			value = teamId;
		},
	};
}

describe("getCurrentTeam", () => {
	it("retorna o time quando o cookie aponta para um time existente", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");
		const store = createFakeCurrentTeamStore(team.id);
		expect(await getCurrentTeam(store, repository)).toEqual(team);
	});

	it("retorna null quando não há cookie", async () => {
		const repository = createFakeTeamRepository();
		const store = createFakeCurrentTeamStore(null);
		expect(await getCurrentTeam(store, repository)).toBeNull();
	});

	it("retorna null quando o cookie aponta para um time que não existe mais", async () => {
		const repository = createFakeTeamRepository();
		const store = createFakeCurrentTeamStore("time-excluido");
		expect(await getCurrentTeam(store, repository)).toBeNull();
	});
});
