import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { drizzleTaskHistoryRepository } from "@/infrastructure/task/drizzle-task-history-repository";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";
import { drizzleMetricsQueryPort } from "./drizzle-metrics-query-port";

const TEAM_ID = "11111111-1111-1111-1111-111111111111";

async function resetTasksTable() {
	await db.execute(
		sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE`,
	);
}

describe("drizzleMetricsQueryPort", () => {
	let typeId: string;

	beforeEach(async () => {
		const taskType = await drizzleTaskTypeRepository.create("Bug", "#dc2626");
		typeId = taskType.id;
	});

	afterEach(async () => {
		await resetTasksTable();
		await drizzleTaskTypeRepository.delete(typeId);
	});

	it("lista tasks concluídas no período com o histórico completo", async () => {
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: null,
		});
		await drizzleTaskHistoryRepository.recordStatusChange(
			task.id,
			null,
			"TODO",
		);
		await drizzleTaskHistoryRepository.recordStatusChange(
			task.id,
			"TODO",
			"IN_DEVELOPMENT",
		);
		await drizzleTaskHistoryRepository.recordStatusChange(
			task.id,
			"IN_DEVELOPMENT",
			"DONE",
		);
		await drizzleTaskRepository.updateStatus(task.id, "DONE");

		const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const completed = await drizzleMetricsQueryPort.listCompletedTasksInPeriod(
			TEAM_ID,
			periodStart,
			periodEnd,
		);

		expect(completed).toHaveLength(1);
		expect(completed[0].taskId).toBe(task.id);
		expect(completed[0].statusChanges).toHaveLength(3);
	});

	it("não lista tasks concluídas fora do período", async () => {
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "DONE",
			dueDate: null,
		});
		await drizzleTaskHistoryRepository.recordStatusChange(
			task.id,
			null,
			"DONE",
		);

		const periodStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const periodEnd = new Date(Date.now() + 48 * 60 * 60 * 1000);
		const completed = await drizzleMetricsQueryPort.listCompletedTasksInPeriod(
			TEAM_ID,
			periodStart,
			periodEnd,
		);

		expect(completed).toEqual([]);
	});

	it("lista tasks com dueDate no período informando a primeira conclusão", async () => {
		const task = await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: "2026-07-10",
		});
		await drizzleTaskHistoryRepository.recordStatusChange(
			task.id,
			null,
			"DONE",
		);
		await drizzleTaskRepository.updateStatus(task.id, "DONE");

		const result = await drizzleMetricsQueryPort.listTasksWithDueDateInPeriod(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(result).toHaveLength(1);
		expect(result[0].dueDate).toBe("2026-07-10");
		expect(result[0].firstCompletedAt).not.toBeNull();
	});

	it("retorna firstCompletedAt nulo para task com dueDate ainda não concluída", async () => {
		await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "Corrigir bug",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: "2026-07-10",
		});

		const result = await drizzleMetricsQueryPort.listTasksWithDueDateInPeriod(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(result[0].firstCompletedAt).toBeNull();
	});

	it("conta o WIP como tasks em IN_DEVELOPMENT ou CODE_REVIEW", async () => {
		await drizzleTaskRepository.create({
			externalId: "TASK-1",
			description: "A",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "IN_DEVELOPMENT",
			dueDate: null,
		});
		await drizzleTaskRepository.create({
			externalId: "TASK-2",
			description: "B",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "CODE_REVIEW",
			dueDate: null,
		});
		await drizzleTaskRepository.create({
			externalId: "TASK-3",
			description: "C",
			typeId,
			assigneeId: null,
			teamId: TEAM_ID,
			status: "TODO",
			dueDate: null,
		});

		expect(await drizzleMetricsQueryPort.countWip(TEAM_ID)).toBe(2);
	});
});
