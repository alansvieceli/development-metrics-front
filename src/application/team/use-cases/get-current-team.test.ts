import { describe, expect, it, vi } from "vitest";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";
import { getCurrentTeam } from "./get-current-team";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

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
		const team = {
			id: "550e8400-e29b-41d4-a716-446655440000",
			name: "Time A",
		};
		vi.spyOn(repository, "findById").mockResolvedValue(team);
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
		const store = createFakeCurrentTeamStore(
			"550e8400-e29b-41d4-a716-446655440000",
		);
		expect(await getCurrentTeam(store, repository)).toBeNull();
	});

	it("não consulta o repositório quando o cookie não é UUID", async () => {
		const repository = createFakeTeamRepository();
		const findById = vi.spyOn(repository, "findById");
		const store = createFakeCurrentTeamStore("abc");

		expect(await getCurrentTeam(store, repository)).toBeNull();
		expect(findById).not.toHaveBeenCalled();
	});
});
