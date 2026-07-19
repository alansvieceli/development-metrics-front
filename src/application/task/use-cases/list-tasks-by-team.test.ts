import { describe, expect, it } from "vitest";
import { listTasksByTeam } from "./list-tasks-by-team";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";

const baseData = {
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	dueDate: "2026-07-01",
};

describe("listTasksByTeam", () => {
	it("agrupa as tasks do time por status", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		repository.seed({
			...baseData,
			externalId: "TASK-1",
			status: "TODO",
		});
		repository.seed({
			...baseData,
			externalId: "TASK-2",
			status: "IN_DEVELOPMENT",
		});
		repository.seed({
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
		const task = await repository.seed({
			...baseData,
			externalId: "TASK-1",
			status: "TODO",
		});
		const initialChangedAt = new Date("2026-07-17T10:00:00Z");
		const expectedChangedAt = new Date("2026-07-18T10:00:00Z");
		historyRepository.seedStatusChange({
			taskId: task.id,
			fromStatus: null,
			toStatus: "TODO",
			changedAt: initialChangedAt,
		});
		historyRepository.seedStatusChange({
			taskId: task.id,
			fromStatus: "TODO",
			toStatus: "IN_DEVELOPMENT",
			changedAt: expectedChangedAt,
		});
		await repository.moveWithHistory(task.id, "IN_DEVELOPMENT");

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
		const task = await repository.seed({
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

	it("agrupa tasks nas colunas de testes e aguardando publicacao", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		repository.seed({ ...baseData, externalId: "TASK-4", status: "TESTING" });
		repository.seed({
			...baseData,
			externalId: "TASK-5",
			status: "AWAITING_PUBLICATION",
		});

		const result = await listTasksByTeam(
			repository,
			historyRepository,
			"team-1",
		);

		expect(result.TESTING.map((t) => t.externalId)).toEqual(["TASK-4"]);
		expect(result.AWAITING_PUBLICATION.map((t) => t.externalId)).toEqual([
			"TASK-5",
		]);
	});
});
