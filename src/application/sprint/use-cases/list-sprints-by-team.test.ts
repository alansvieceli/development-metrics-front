import { describe, expect, it } from "vitest";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { listSprintsByTeam } from "./list-sprints-by-team";

describe("listSprintsByTeam", () => {
	it("lista apenas as sprints do time informado", async () => {
		const repository = createFakeSprintRepository();
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint do time 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await repository.create({
			piId: "pi-2",
			teamId: "team-2",
			name: "Sprint do time 2",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const result = await listSprintsByTeam(repository, "team-1");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Sprint do time 1");
	});
});
