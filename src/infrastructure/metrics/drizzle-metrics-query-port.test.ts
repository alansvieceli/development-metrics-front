import type { InferInsertModel } from "drizzle-orm";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
	taskTags,
	taskTypes,
} from "@/infrastructure/task/drizzle/schema";
import { drizzleTagRepository } from "@/infrastructure/task/drizzle-tag-repository";
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
		const taskType = await drizzleTaskTypeRepository.create(
			"Tarefa",
			"#64748b",
			false,
		);
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

	it("carrega os bugs abertos com a task de origem resolvida via self-join", async () => {
		const [bugType] = await db
			.insert(taskTypes)
			.values({ name: "Bug-teste", color: "#dc2626", isBug: true })
			.returning();
		try {
			const parent = await insertTask({ externalId: "TASK-PAI" });
			const bugWithParent = await insertTask({
				externalId: "TASK-BUG-1",
				typeId: bugType.id,
				parentTaskId: parent.id,
			});
			const orphanBug = await insertTask({
				externalId: "TASK-BUG-2",
				typeId: bugType.id,
			});

			const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
				TEAM_ID,
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-08-01T00:00:00Z"),
			);

			expect(snapshot.bugEvents).toHaveLength(2);
			const withParent = snapshot.bugEvents.find(
				(event) => event.taskId === bugWithParent.id,
			);
			expect(withParent?.parentTaskId).toBe(parent.id);
			expect(withParent?.parentExternalId).toBe("TASK-PAI");
			const orphan = snapshot.bugEvents.find(
				(event) => event.taskId === orphanBug.id,
			);
			expect(orphan?.parentTaskId).toBeNull();
			expect(orphan?.parentExternalId).toBeNull();
		} finally {
			await resetTasksTable();
			await db.delete(taskTypes).where(eq(taskTypes.id, bugType.id));
		}
	});

	it("filtra todas as métricas pelo responsável sem alterar a consulta agregada", async () => {
		const memberA = "22222222-2222-2222-2222-222222222222";
		const memberB = "33333333-3333-3333-3333-333333333333";
		const taskA = await insertTask({
			externalId: "TASK-A",
			description: "Entrega da Ana",
			assigneeId: memberA,
			status: "DONE",
			dueDate: "2026-07-10",
		});
		const taskB = await insertTask({
			externalId: "TASK-B",
			description: "Entrega do Bruno",
			assigneeId: memberB,
			status: "DONE",
			dueDate: "2026-07-10",
		});
		await db.insert(taskStatusChanges).values([
			{
				taskId: taskA.id,
				fromStatus: "IN_DEVELOPMENT",
				toStatus: "DONE",
				changedAt: new Date("2026-07-10T12:00:00Z"),
			},
			{
				taskId: taskB.id,
				fromStatus: "IN_DEVELOPMENT",
				toStatus: "DONE",
				changedAt: new Date("2026-07-10T13:00:00Z"),
			},
		]);
		const [bugType] = await db
			.insert(taskTypes)
			.values({ name: "Bug individual", color: "#dc2626", isBug: true })
			.returning();
		try {
			await insertTask({
				externalId: "BUG-A",
				description: "Bug associado à entrega A",
				typeId: bugType.id,
				parentTaskId: taskA.id,
				createdAt: new Date("2026-07-11T00:00:00Z"),
			});

			const start = new Date("2026-07-01T00:00:00Z");
			const end = new Date("2026-08-01T00:00:00Z");
			const individual = await drizzleMetricsQueryPort.loadSnapshot(
				TEAM_ID,
				start,
				end,
				memberA,
			);
			const aggregate = await drizzleMetricsQueryPort.loadSnapshot(
				TEAM_ID,
				start,
				end,
			);

			expect(
				individual.completionEvents.map((item) => item.externalId),
			).toEqual(["TASK-A"]);
			expect(individual.dueDateTasks.map((item) => item.externalId)).toEqual([
				"TASK-A",
			]);
			expect(individual.bugEvents[0]).toMatchObject({
				parentTaskId: taskA.id,
				parentExternalId: "TASK-A",
				parentDescription: "Entrega da Ana",
			});
			expect(aggregate.completionEvents).toHaveLength(2);
		} finally {
			await resetTasksTable();
			await db.delete(taskTypes).where(eq(taskTypes.id, bugType.id));
		}
	});

	it("carrega o snapshot em no máximo seis queries", async () => {
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
			expect(queryCount).toBeLessThanOrEqual(6);
		} finally {
			await client.end();
		}
	});

	it("filtra tasks concluídas por qualquer uma das tarjas selecionadas (OR)", async () => {
		const tagA = await drizzleTagRepository.create("Tarja A", "#2563eb");
		const tagB = await drizzleTagRepository.create("Tarja B", "#dc2626");
		const taskWithA = await insertTask({
			externalId: "TASK-A",
			status: "DONE",
		});
		const taskWithB = await insertTask({
			externalId: "TASK-B",
			status: "DONE",
		});
		const taskWithoutTag = await insertTask({
			externalId: "TASK-C",
			status: "DONE",
		});
		await db.insert(taskTags).values([
			{ taskId: taskWithA.id, tagId: tagA.id },
			{ taskId: taskWithB.id, tagId: tagB.id },
		]);
		await db.insert(taskStatusChanges).values([
			{ taskId: taskWithA.id, fromStatus: null, toStatus: "DONE" },
			{ taskId: taskWithB.id, fromStatus: null, toStatus: "DONE" },
			{ taskId: taskWithoutTag.id, fromStatus: null, toStatus: "DONE" },
		]);

		try {
			const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
			const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
			const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
				TEAM_ID,
				periodStart,
				periodEnd,
				undefined,
				[tagA.id, tagB.id],
			);

			expect(
				snapshot.completionEvents.map((event) => event.taskId).sort(),
			).toEqual([taskWithA.id, taskWithB.id].sort());
		} finally {
			await resetTasksTable();
			await drizzleTagRepository.delete(tagA.id);
			await drizzleTagRepository.delete(tagB.id);
		}
	});

	it("sem tarja selecionada, não filtra nada", async () => {
		const task = await insertTask({ externalId: "TASK-A", status: "DONE" });
		await db.insert(taskStatusChanges).values({
			taskId: task.id,
			fromStatus: null,
			toStatus: "DONE",
		});

		const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
		const snapshot = await drizzleMetricsQueryPort.loadSnapshot(
			TEAM_ID,
			periodStart,
			periodEnd,
			undefined,
			[],
		);

		expect(snapshot.completionEvents).toHaveLength(1);
	});

	it("filtra bugs abertos pela tarja do próprio bug, não da task de origem", async () => {
		const [bugType] = await db
			.insert(taskTypes)
			.values({ name: "Bug-tarja", color: "#dc2626", isBug: true })
			.returning();
		const tagOnParent = await drizzleTagRepository.create(
			"Na origem",
			"#2563eb",
		);
		const tagOnBug = await drizzleTagRepository.create("No bug", "#dc2626");
		try {
			const parent = await insertTask({ externalId: "TASK-PAI" });
			const bug = await insertTask({
				externalId: "TASK-BUG",
				typeId: bugType.id,
				parentTaskId: parent.id,
			});
			await db.insert(taskTags).values([
				{ taskId: parent.id, tagId: tagOnParent.id },
				{ taskId: bug.id, tagId: tagOnBug.id },
			]);

			const start = new Date("2026-07-01T00:00:00Z");
			const end = new Date("2026-08-01T00:00:00Z");
			const filteredByBugTag = await drizzleMetricsQueryPort.loadSnapshot(
				TEAM_ID,
				start,
				end,
				undefined,
				[tagOnBug.id],
			);
			const filteredByParentTag = await drizzleMetricsQueryPort.loadSnapshot(
				TEAM_ID,
				start,
				end,
				undefined,
				[tagOnParent.id],
			);

			expect(filteredByBugTag.bugEvents).toHaveLength(1);
			expect(filteredByParentTag.bugEvents).toHaveLength(0);
		} finally {
			await resetTasksTable();
			await db.delete(taskTypes).where(eq(taskTypes.id, bugType.id));
			await drizzleTagRepository.delete(tagOnParent.id);
			await drizzleTagRepository.delete(tagOnBug.id);
		}
	});
});
