import { describe, expect, it } from "vitest";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { toggleBlocked } from "./toggle-blocked";

const baseData = {
	externalId: "TASK-1",
	description: "Corrigir bug",
	typeId: "type-1",
	assigneeId: null,
	teamId: "team-1",
	status: "TODO" as const,
	dueDate: "2026-07-01",
};

describe("toggleBlocked", () => {
	it("bloqueia a task e abre um período de bloqueio", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed(baseData);

		const blocked = await toggleBlocked(repository, "team-1", task.id, true);

		expect(blocked.blocked).toBe(true);
		expect(repository.blockedPeriods).toHaveLength(1);
		expect(repository.blockedPeriods[0].unblockedAt).toBeNull();
	});

	it("desbloqueia a task e fecha o período de bloqueio", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed(baseData);
		await toggleBlocked(repository, "team-1", task.id, true);

		const unblocked = await toggleBlocked(repository, "team-1", task.id, false);

		expect(unblocked.blocked).toBe(false);
		expect(repository.blockedPeriods[0].unblockedAt).not.toBeNull();
	});

	it("é idempotente ao bloquear uma task já bloqueada", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed(baseData);
		await toggleBlocked(repository, "team-1", task.id, true);

		await toggleBlocked(repository, "team-1", task.id, true);

		expect(repository.blockedPeriods).toHaveLength(1);
	});

	it("é idempotente ao desbloquear uma task já desbloqueada", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed(baseData);

		await toggleBlocked(repository, "team-1", task.id, false);

		expect(repository.blockedPeriods).toHaveLength(0);
	});

	it("não altera task de outro time", async () => {
		const repository = createFakeTaskRepository();
		const task = await repository.seed(baseData);

		await expect(
			toggleBlocked(repository, "team-2", task.id, true),
		).rejects.toThrow("Task não encontrada");
		expect((await repository.findById(task.id))?.blocked).toBe(false);
	});
});
