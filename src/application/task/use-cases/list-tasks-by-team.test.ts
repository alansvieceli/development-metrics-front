import { describe, expect, it } from "vitest";
import { listTasksByTeam } from "./list-tasks-by-team";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";

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
		const historyRepository = createFakeTaskHistoryRepository();
		await repository.create({
			...baseData,
			externalId: "TASK-1",
			status: "TODO",
		});
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

		const result = await listTasksByTeam(
			repository,
			historyRepository,
			"team-1",
		);

		expect(result.TODO.map((t) => t.externalId)).toEqual(["TASK-1"]);
		expect(result.IN_DEVELOPMENT.map((t) => t.externalId)).toEqual(["TASK-2"]);
		expect(result.CODE_REVIEW).toEqual([]);
		expect(result.DONE).toEqual([]);
	});

	it("usa a última mudança de status registrada como statusChangedAt", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create({
			...baseData,
			externalId: "TASK-1",
			status: "TODO",
		});
		await historyRepository.recordStatusChange(task.id, null, "TODO");
		await historyRepository.recordStatusChange(
			task.id,
			"TODO",
			"IN_DEVELOPMENT",
		);
		await repository.updateStatus(task.id, "IN_DEVELOPMENT");
		const expectedChangedAt =
			historyRepository.statusChanges[
				historyRepository.statusChanges.length - 1
			].changedAt;

		const result = await listTasksByTeam(
			repository,
			historyRepository,
			"team-1",
		);

		expect(result.IN_DEVELOPMENT[0].statusChangedAt).toEqual(expectedChangedAt);
	});

	it("usa createdAt como fallback quando não há histórico registrado", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create({
			...baseData,
			externalId: "TASK-1",
			status: "TODO",
		});

		const result = await listTasksByTeam(
			repository,
			historyRepository,
			"team-1",
		);

		expect(result.TODO[0].statusChangedAt).toEqual(task.createdAt);
	});
});
