import { describe, expect, it } from "vitest";
import { createFakeSprintTaskSnapshotRepository } from "./test-helpers/create-fake-sprint-task-snapshot-repository";
import { getSprintHistory } from "./get-sprint-history";

describe("getSprintHistory", () => {
	it("lista os snapshots de task da sprint informada", async () => {
		const repository = createFakeSprintTaskSnapshotRepository();
		await repository.createMany([
			{
				sprintId: "sprint-1",
				taskId: "task-1",
				externalId: "TASK-1",
				description: "Descrição",
				typeId: "type-1",
				assigneeId: null,
				statusAtFreeze: "DONE",
				carriedOver: false,
			},
			{
				sprintId: "sprint-2",
				taskId: "task-2",
				externalId: "TASK-2",
				description: "Descrição",
				typeId: "type-1",
				assigneeId: null,
				statusAtFreeze: "TODO",
				carriedOver: true,
			},
		]);

		const result = await getSprintHistory(repository, "sprint-1");

		expect(result).toHaveLength(1);
		expect(result[0].externalId).toBe("TASK-1");
	});
});
