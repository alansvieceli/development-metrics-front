import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { taskBlockedPeriods, taskStatusChanges } from "./drizzle/schema";
import { drizzleTaskHistoryRepository } from "./drizzle-task-history-repository";
import { drizzleTaskRepository } from "./drizzle-task-repository";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";

describe("drizzleTaskHistoryRepository", () => {
	let typeId: string;
	let taskId: string;

	beforeEach(async () => {
		const taskType = await drizzleTaskTypeRepository.create("Bug", "#dc2626");
		typeId = taskType.id;
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: "11111111-1111-1111-1111-111111111111",
			status: "TODO",
			dueDate: null,
		});
		taskId = task.id;
	});

	afterEach(async () => {
		await db.execute(
			sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE`,
		);
		await drizzleTaskTypeRepository.delete(typeId);
	});

	it("grava uma transição de status", async () => {
		await drizzleTaskHistoryRepository.recordStatusChange(
			taskId,
			"TODO",
			"IN_DEVELOPMENT",
		);
		const rows = await db
			.select()
			.from(taskStatusChanges)
			.where(eq(taskStatusChanges.taskId, taskId));
		expect(rows).toHaveLength(1);
		expect(rows[0].fromStatus).toBe("TODO");
		expect(rows[0].toStatus).toBe("IN_DEVELOPMENT");
	});

	it("abre e fecha um período de bloqueio", async () => {
		await drizzleTaskHistoryRepository.openBlockedPeriod(taskId);
		let rows = await db
			.select()
			.from(taskBlockedPeriods)
			.where(eq(taskBlockedPeriods.taskId, taskId));
		expect(rows).toHaveLength(1);
		expect(rows[0].unblockedAt).toBeNull();

		await drizzleTaskHistoryRepository.closeBlockedPeriod(taskId);
		rows = await db
			.select()
			.from(taskBlockedPeriods)
			.where(eq(taskBlockedPeriods.taskId, taskId));
		expect(rows[0].unblockedAt).not.toBeNull();
	});

	it("rejeita fechar um período de bloqueio quando não há nenhum aberto", async () => {
		await expect(
			drizzleTaskHistoryRepository.closeBlockedPeriod(taskId),
		).rejects.toThrow("Não há período de bloqueio aberto para esta task");
	});

	it("retorna a data da mudança de status mais recente por task", async () => {
		await drizzleTaskHistoryRepository.recordStatusChange(taskId, null, "TODO");
		await drizzleTaskHistoryRepository.recordStatusChange(
			taskId,
			"TODO",
			"IN_DEVELOPMENT",
		);
		const rows = await db
			.select()
			.from(taskStatusChanges)
			.where(eq(taskStatusChanges.taskId, taskId));
		const latest = rows.reduce((a, b) => (a.changedAt > b.changedAt ? a : b));

		const result =
			await drizzleTaskHistoryRepository.getStatusChangedAtForTasks([taskId]);

		expect(result[taskId]).toEqual(latest.changedAt);
	});

	it("retorna objeto vazio quando não há ids de task", async () => {
		const result =
			await drizzleTaskHistoryRepository.getStatusChangedAtForTasks([]);
		expect(result).toEqual({});
	});
});
