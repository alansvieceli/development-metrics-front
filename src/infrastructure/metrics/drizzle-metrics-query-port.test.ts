import type { InferInsertModel } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
} from "@/infrastructure/task/drizzle/schema";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";
import { getTestDatabaseUrl } from "../../../scripts/test-database-url";
import {
	createDrizzleMetricsQueryPort,
	drizzleMetricsQueryPort,
} from "./drizzle-metrics-query-port";

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
				dueDate: "2026-07-01",
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
		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			periodStart,
			periodEnd,
		);

		expect(snapshot.completionEvents).toHaveLength(1);
		expect(snapshot.completionEvents[0].taskId).toBe(task.id);
		expect(snapshot.completionEvents[0].dueDate).toBe("2026-07-01");
		expect(snapshot.statusChanges).toHaveLength(3);
	});

	it("não lista tasks concluídas fora do período", async () => {
		const task = await insertTask({ status: "DONE" });
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: null,
			toStatus: "DONE",
		});

		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			new Date(Date.now() + 24 * 60 * 60 * 1000),
			new Date(Date.now() + 48 * 60 * 60 * 1000),
		);
		expect(snapshot.completionEvents).toEqual([]);
	});

	it("lista tasks com dueDate no período informando a primeira conclusão", async () => {
		const task = await insertTask({ status: "DONE", dueDate: "2026-07-10" });
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: null,
			toStatus: "DONE",
		});

		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(snapshot.dueDateTasks).toHaveLength(1);
		expect(snapshot.dueDateTasks[0].dueDate).toBe("2026-07-10");
		expect(snapshot.dueDateTasks[0].firstCompletedAt).not.toBeNull();
	});

	it("retorna firstCompletedAt nulo para task ainda não concluída", async () => {
		await insertTask({ dueDate: "2026-07-10" });
		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);
		expect(snapshot.dueDateTasks[0].firstCompletedAt).toBeNull();
	});

	it("carrega os cards do WIP atual", async () => {
		await insertTask({ externalId: "TASK-1", status: "IN_DEVELOPMENT" });
		await insertTask({
			externalId: "TASK-2",
			status: "IN_DEVELOPMENT",
			blocked: true,
		});
		await insertTask({ externalId: "TASK-3", status: "CODE_REVIEW" });
		await insertTask({ externalId: "TASK-4", status: "TESTING" });
		await insertTask({ externalId: "TASK-5", status: "AWAITING_PUBLICATION" });
		await insertTask({ externalId: "TASK-6", status: "TODO" });
		await insertTask({ externalId: "TASK-7", status: "DONE" });

		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);
		expect(snapshot.currentWipTasks).toHaveLength(5);
		expect(
			snapshot.currentWipTasks.filter((task) => task.blockedAt !== null),
		).toHaveLength(0);
		expect(snapshot.currentWipTasks.map((task) => task.status)).toEqual(
			expect.arrayContaining([
				"IN_DEVELOPMENT",
				"CODE_REVIEW",
				"TESTING",
				"AWAITING_PUBLICATION",
			]),
		);
	});

	it("carrega a entrada no status e o bloqueio aberto do WIP atual", async () => {
		const statusChangedAt = new Date("2026-07-18T06:00:00Z");
		const blockedAt = new Date("2026-07-18T12:00:00Z");
		const task = await insertTask({
			externalId: "TASK-WIP",
			status: "CODE_REVIEW",
			blocked: true,
			createdAt: new Date("2026-07-17T00:00:00Z"),
		});
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: "IN_DEVELOPMENT",
			toStatus: "CODE_REVIEW",
			changedAt: statusChangedAt,
		});
		await db.insert(taskBlockedPeriods).values({
			taskId: task.id,
			blockedAt,
		});

		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			new Date("2026-07-01T00:00:00Z"),
			new Date("2026-08-01T00:00:00Z"),
		);

		expect(snapshot.currentWipTasks).toEqual([
			{
				status: "CODE_REVIEW",
				statusChangedAt,
				blockedAt,
			},
		]);
	});

	it("carrega o snapshot em no máximo cinco queries", async () => {
		const task = await insertTask({ status: "DONE", dueDate: "2026-07-10" });
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: "IN_DEVELOPMENT",
			toStatus: "DONE",
		});
		let queryCount = 0;
		const client = postgres(getTestDatabaseUrl(), {
			max: 1,
			debug() {
				queryCount += 1;
			},
		});
		const port = createDrizzleMetricsQueryPort(drizzle(client));

		try {
			await client.unsafe("select 1");
			queryCount = 0;
			await port.loadSnapshot(
				TEAM_ID,
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-08-01T00:00:00Z"),
			);
			expect(queryCount).toBeLessThanOrEqual(5);
		} finally {
			await client.end();
		}
	});
});
