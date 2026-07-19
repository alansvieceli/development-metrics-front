import type { InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { taskStatusChanges, tasks } from "@/infrastructure/task/drizzle/schema";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";
import { drizzleMetricsQueryPort } from "./drizzle-metrics-query-port";

const TEAM_ID = "11111111-1111-1111-1111-111111111111";

async function resetTasksTable() {
	await db.execute(
		sql.raw(
			"TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE",
		),
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

	async function insertTask(
		overrides: Partial<InferInsertModel<typeof tasks>> = {},
	) {
		const [task] = await db
			.insert(tasks)
			.values({
				externalId: "TASK-1",
				description: "Corrigir bug",
				typeId,
				assigneeId: null,
				teamId: TEAM_ID,
				status: "TODO",
				dueDate: null,
				...overrides,
			})
			.returning();
		return task;
	}

	it("lista tasks concluídas no período com o histórico completo", async () => {
		const task = await insertTask({ status: "DONE" });
		await db.insert(taskStatusChanges).values([
			{ taskId: task.id, fromStatus: null, toStatus: "TODO" },
			{
				taskId: task.id,
				fromStatus: "TODO",
				toStatus: "IN_DEVELOPMENT",
			},
			{
				taskId: task.id,
				fromStatus: "IN_DEVELOPMENT",
				toStatus: "DONE",
			},
		]);

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
		const task = await insertTask({ status: "DONE" });
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: null,
			toStatus: "DONE",
		});

		const completed = await drizzleMetricsQueryPort.listCompletedTasksInPeriod(
			TEAM_ID,
			new Date(Date.now() + 24 * 60 * 60 * 1000),
			new Date(Date.now() + 48 * 60 * 60 * 1000),
		);
		expect(completed).toEqual([]);
	});

	it("lista tasks com dueDate no período informando a primeira conclusão", async () => {
		const task = await insertTask({ status: "DONE", dueDate: "2026-07-10" });
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: null,
			toStatus: "DONE",
		});

		const result = await drizzleMetricsQueryPort.listTasksWithDueDateInPeriod(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(result).toHaveLength(1);
		expect(result[0].dueDate).toBe("2026-07-10");
		expect(result[0].firstCompletedAt).not.toBeNull();
	});

	it("retorna firstCompletedAt nulo para task ainda não concluída", async () => {
		await insertTask({ dueDate: "2026-07-10" });
		const result = await drizzleMetricsQueryPort.listTasksWithDueDateInPeriod(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);
		expect(result[0].firstCompletedAt).toBeNull();
	});

	it("conta o WIP como tasks em desenvolvimento ou code review", async () => {
		await insertTask({ externalId: "TASK-1", status: "IN_DEVELOPMENT" });
		await insertTask({ externalId: "TASK-2", status: "CODE_REVIEW" });
		await insertTask({ externalId: "TASK-3", status: "TODO" });

		expect(await drizzleMetricsQueryPort.countWip(TEAM_ID)).toBe(2);
	});
});
