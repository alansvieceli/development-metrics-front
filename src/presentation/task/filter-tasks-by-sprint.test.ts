import { describe, expect, it } from "vitest";
import type { TaskWithStatusSince } from "@/application/task/use-cases/list-tasks-by-team";
import { filterTasksByStatusBySprint } from "./filter-tasks-by-sprint";

function task(overrides: Partial<TaskWithStatusSince>): TaskWithStatusSince {
	return {
		id: "task-1",
		externalId: "TASK-1",
		description: "Descrição",
		typeId: "type-1",
		assigneeId: null,
		teamId: "team-1",
		status: "TODO",
		blocked: false,
		dueDate: "2026-07-01",
		parentTaskId: null,
		sprintId: null,
		createdAt: new Date(),
		updatedAt: new Date(),
		statusChangedAt: new Date(),
		bugChildCount: 0,
		otherChildCount: 0,
		parentTask: null,
		tags: [],
		...overrides,
	};
}

describe("filterTasksByStatusBySprint", () => {
	it("mantém apenas as tasks da sprint informada em cada coluna", () => {
		const result = filterTasksByStatusBySprint(
			{
				TODO: [
					task({ id: "1", sprintId: "sprint-1" }),
					task({ id: "2", sprintId: "sprint-2" }),
				],
				IN_DEVELOPMENT: [task({ id: "3", sprintId: "sprint-1" })],
				CODE_REVIEW: [],
				TESTING: [],
				AWAITING_PUBLICATION: [],
				DONE: [task({ id: "4", sprintId: null })],
			},
			"sprint-1",
		);

		expect(result.TODO.map((t) => t.id)).toEqual(["1"]);
		expect(result.IN_DEVELOPMENT.map((t) => t.id)).toEqual(["3"]);
		expect(result.DONE).toEqual([]);
	});
});
