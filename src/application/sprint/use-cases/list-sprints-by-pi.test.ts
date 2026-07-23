import { describe, expect, it } from "vitest";
import { listSprintsByPi } from "./list-sprints-by-pi";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";

describe("listSprintsByPi", () => {
	it("lista apenas as sprints do pi informado", async () => {
		const repository = createFakeSprintRepository();
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint do pi 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await repository.create({
			piId: "pi-2",
			teamId: "team-1",
			name: "Sprint do pi 2",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const result = await listSprintsByPi(repository, "pi-1");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Sprint do pi 1");
	});
});
