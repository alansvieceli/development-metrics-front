import { describe, expect, it } from "vitest";
import { createFakeProgramIncrementRepository } from "./test-helpers/create-fake-program-increment-repository";
import { listProgramIncrementsByTeam } from "./list-program-increments-by-team";

describe("listProgramIncrementsByTeam", () => {
	it("lista apenas os pis do time informado", async () => {
		const repository = createFakeProgramIncrementRepository();
		await repository.create({
			teamId: "team-1",
			name: "PI do time 1",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});
		await repository.create({
			teamId: "team-2",
			name: "PI do time 2",
			startDate: "2026-07-01",
			endDate: "2026-09-30",
		});

		const result = await listProgramIncrementsByTeam(repository, "team-1");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("PI do time 1");
	});
});
