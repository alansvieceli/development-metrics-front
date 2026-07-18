import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { listTasksByTeam } from "./list-tasks-by-team";

const baseData = {
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	dueDate: null,
};

describe("listTasksByTeam", () => {
	it("agrupa as tasks do time por status", async () => {
		const repository = createFakeTaskRepository();
		await repository.create({ ...baseData, externalId: "TASK-1", status: "TODO" });
		await repository.create({
			...baseData,
			externalId: "TASK-2",
			status: "IN_DEVELOPMENT",
		});
		await repository.create({
			...baseData,
			externalId: "TASK-3",
			teamId: "team-2",
			status: "TODO",
		});

		const result = await listTasksByTeam(repository, "team-1");

		expect(result.TODO.map((t) => t.externalId)).toEqual(["TASK-1"]);
		expect(result.IN_DEVELOPMENT.map((t) => t.externalId)).toEqual(["TASK-2"]);
		expect(result.CODE_REVIEW).toEqual([]);
		expect(result.DONE).toEqual([]);
	});
});
