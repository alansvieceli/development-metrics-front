import { describe, expect, it } from "vitest";
import type { SprintAccess } from "@/application/sprint/contracts/sprint-access";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import { validateSprintId } from "./validate-sprint-id";

const sprint: Sprint = {
	id: "sprint-1",
	piId: "pi-1",
	teamId: "team-1",
	name: "Sprint 1",
	startDate: "2026-07-01",
	endDate: "2026-07-14",
	status: "PLANNED",
};

function fakeAccess(sprints: Sprint[]): SprintAccess {
	return {
		async findById(sprintId) {
			return sprints.find((item) => item.id === sprintId) ?? null;
		},
	};
}

describe("validateSprintId", () => {
	it("aceita uma sprint existente do mesmo time", async () => {
		await expect(
			validateSprintId(fakeAccess([sprint]), "sprint-1", "team-1"),
		).resolves.toBeUndefined();
	});

	it("rejeita sprint inexistente", async () => {
		await expect(
			validateSprintId(fakeAccess([]), "sprint-missing", "team-1"),
		).rejects.toThrow("Sprint não encontrada");
	});

	it("rejeita sprint de outro time", async () => {
		await expect(
			validateSprintId(fakeAccess([sprint]), "sprint-1", "team-2"),
		).rejects.toThrow("Sprint não encontrada");
	});
});
