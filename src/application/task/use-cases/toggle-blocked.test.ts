import { describe, expect, it } from "vitest";
import { createFakeTaskHistoryRepository } from "./test-helpers/create-fake-task-history-repository";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { toggleBlocked } from "./toggle-blocked";

const baseData = {
	externalId: "TASK-1",
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: null,
};

describe("toggleBlocked", () => {
	it("bloqueia a task e abre um período de bloqueio", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		const blocked = await toggleBlocked(repository, historyRepository, task.id, true);

		expect(blocked.blocked).toBe(true);
		expect(historyRepository.blockedPeriods).toHaveLength(1);
		expect(historyRepository.blockedPeriods[0].unblockedAt).toBeNull();
	});

	it("desbloqueia a task e fecha o período de bloqueio", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);
		await toggleBlocked(repository, historyRepository, task.id, true);

		const unblocked = await toggleBlocked(
			repository,
			historyRepository,
			task.id,
			false,
		);

		expect(unblocked.blocked).toBe(false);
		expect(historyRepository.blockedPeriods[0].unblockedAt).not.toBeNull();
	});

	it("é idempotente ao bloquear uma task já bloqueada", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);
		await toggleBlocked(repository, historyRepository, task.id, true);

		await toggleBlocked(repository, historyRepository, task.id, true);

		expect(historyRepository.blockedPeriods).toHaveLength(1);
	});

	it("é idempotente ao desbloquear uma task já desbloqueada", async () => {
		const repository = createFakeTaskRepository();
		const historyRepository = createFakeTaskHistoryRepository();
		const task = await repository.create(baseData);

		await toggleBlocked(repository, historyRepository, task.id, false);

		expect(historyRepository.blockedPeriods).toHaveLength(0);
	});
});
