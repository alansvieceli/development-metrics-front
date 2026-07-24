import { describe, expect, it, vi } from "vitest";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";
import { selectTeam } from "./select-team";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

const TEAM_ID = "550e8400-e29b-41d4-a716-446655440000";

function createStore(): CurrentTeamStore {
	return { get: vi.fn(), set: vi.fn() };
}

describe("selectTeam", () => {
	it("grava um time existente", async () => {
		const repository = createFakeTeamRepository();
		vi.spyOn(repository, "findById").mockResolvedValue({
			id: TEAM_ID,
			name: "Time A",
			wipLimit: 6,
			completedTaskLimit: 10,
			businessmapBoardId: null,
		});
		const store = createStore();

		await selectTeam(store, repository, TEAM_ID);

		expect(store.set).toHaveBeenCalledOnce();
		expect(store.set).toHaveBeenCalledWith(TEAM_ID);
	});

	it.each(["550e8400-e29b-41d4-a716-446655440001", "abc"])(
		"não grava o time inexistente %s",
		async (teamId) => {
			const repository = createFakeTeamRepository();
			const store = createStore();

			await expect(selectTeam(store, repository, teamId)).rejects.toThrow(
				"Time não encontrado",
			);
			expect(store.set).not.toHaveBeenCalled();
		},
	);
});
