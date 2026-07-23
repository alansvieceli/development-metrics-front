import { and, eq, isNull, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import {
	taskBlockedPeriods,
	taskStatusChanges,
	tasks,
	taskTags,
} from "./drizzle/schema";
import { drizzleTagRepository } from "./drizzle-tag-repository";
import { drizzleTaskRepository } from "./drizzle-task-repository";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";

async function resetTasksTable() {
	await db.execute(
		sql.raw(
			"TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE",
		),
	);
}

describe("drizzleTaskRepository", () => {
	let typeId: string;

	beforeEach(async () => {
		const taskType = await drizzleTaskTypeRepository.create(
			"Bug",
			"#dc2626",
			true,
		);
		typeId = taskType.id;
	});

	afterEach(async () => {
		await db.execute(
			sql.raw(
				"DROP TRIGGER IF EXISTS reject_task_history ON task_status_changes",
			),
		);
		await db.execute(sql.raw("DROP FUNCTION IF EXISTS reject_task_history()"));
		await resetTasksTable();
		await drizzleTaskTypeRepository.delete(typeId);
	});

	function baseData(
		overrides: Partial<
			Parameters<typeof drizzleTaskRepository.createWithInitialHistory>[0]
		> = {},
	) {
		return {
			externalId: "TASK-1",
			description: "Corrigir bug de login",
			typeId,
			assigneeId: null,
			teamId: "11111111-1111-1111-1111-111111111111",
			status: "TODO" as const,
			dueDate: "2026-07-01",
			parentTaskId: null,
			...overrides,
		};
	}

	it("cria a task e o histórico inicial na mesma operação", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		const history = await db
			.select()
			.from(taskStatusChanges)
			.where(eq(taskStatusChanges.taskId, created.id));

		expect(await drizzleTaskRepository.findById(created.id)).toEqual(created);
		expect(history).toEqual([
			expect.objectContaining({ fromStatus: null, toStatus: "TODO" }),
		]);
	});

	it("cria a task com createdAt explícito e uma transição por etapa", async () => {
		const created = await drizzleTaskRepository.createWithExplicitHistory(
			baseData({ status: "AWAITING_PUBLICATION" }),
			[
				{ status: "TODO", changedAt: new Date("2026-07-01T00:00:00Z") },
				{
					status: "IN_DEVELOPMENT",
					changedAt: new Date("2026-07-03T00:00:00Z"),
				},
				{
					status: "AWAITING_PUBLICATION",
					changedAt: new Date("2026-07-10T00:00:00Z"),
				},
			],
		);

		expect(created.createdAt).toEqual(new Date("2026-07-01T00:00:00Z"));
		expect(created.status).toBe("AWAITING_PUBLICATION");

		const history = await db
			.select()
			.from(taskStatusChanges)
			.where(eq(taskStatusChanges.taskId, created.id));
		expect(
			history
				.sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime())
				.map(({ fromStatus, toStatus, changedAt }) => ({
					fromStatus,
					toStatus,
					changedAt,
				})),
		).toEqual([
			{
				fromStatus: null,
				toStatus: "TODO",
				changedAt: new Date("2026-07-01T00:00:00Z"),
			},
			{
				fromStatus: "TODO",
				toStatus: "IN_DEVELOPMENT",
				changedAt: new Date("2026-07-03T00:00:00Z"),
			},
			{
				fromStatus: "IN_DEVELOPMENT",
				toStatus: "AWAITING_PUBLICATION",
				changedAt: new Date("2026-07-10T00:00:00Z"),
			},
		]);
	});

	it("busca por id externo e lista apenas as tasks do time", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		await drizzleTaskRepository.createWithInitialHistory(
			baseData({
				externalId: "TASK-2",
				teamId: "22222222-2222-2222-2222-222222222222",
			}),
		);

		expect(
			await drizzleTaskRepository.findByExternalId(created.teamId, "TASK-1"),
		).toEqual(created);
		expect(
			(
				await drizzleTaskRepository.listByTeam(
					"11111111-1111-1111-1111-111111111111",
				)
			).map((task) => task.externalId),
		).toEqual(["TASK-1"]);
	});

	it("move a task e registra uma única transição", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		await drizzleTaskRepository.moveWithHistory(created.id, "IN_DEVELOPMENT");
		await drizzleTaskRepository.moveWithHistory(created.id, "IN_DEVELOPMENT");

		const history = await db
			.select()
			.from(taskStatusChanges)
			.where(eq(taskStatusChanges.taskId, created.id));
		expect(
			history.map(({ fromStatus, toStatus }) => ({ fromStatus, toStatus })),
		).toEqual([
			{ fromStatus: null, toStatus: "TODO" },
			{ fromStatus: "TODO", toStatus: "IN_DEVELOPMENT" },
		]);
	});

	it("reverte a mudança de status quando o histórico falha", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		const quote = String.fromCharCode(39);
		const delimiter = String.fromCharCode(36, 36);
		await db.execute(
			sql.raw(
				"CREATE FUNCTION reject_task_history() RETURNS trigger AS " +
					delimiter +
					"BEGIN RAISE EXCEPTION " +
					quote +
					"falha deliberada" +
					quote +
					"; END;" +
					delimiter +
					" LANGUAGE plpgsql",
			),
		);
		await db.execute(
			sql.raw(
				"CREATE TRIGGER reject_task_history BEFORE INSERT ON task_status_changes FOR EACH ROW EXECUTE FUNCTION reject_task_history()",
			),
		);

		await expect(
			drizzleTaskRepository.moveWithHistory(created.id, "DONE"),
		).rejects.toThrow();
		expect((await drizzleTaskRepository.findById(created.id))?.status).toBe(
			"TODO",
		);
	});

	it("abre e fecha o período de bloqueio atomicamente", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		expect(
			(await drizzleTaskRepository.setBlockedWithHistory(created.id, true))
				.blocked,
		).toBe(true);
		expect(
			(await drizzleTaskRepository.setBlockedWithHistory(created.id, false))
				.blocked,
		).toBe(false);

		const periods = await db
			.select()
			.from(taskBlockedPeriods)
			.where(eq(taskBlockedPeriods.taskId, created.id));
		expect(periods).toHaveLength(1);
		expect(periods[0].unblockedAt).not.toBeNull();
	});

	it("serializa bloqueios concorrentes sem duplicar períodos", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		await Promise.all([
			drizzleTaskRepository.setBlockedWithHistory(created.id, true),
			drizzleTaskRepository.setBlockedWithHistory(created.id, true),
		]);

		const openPeriods = await db
			.select()
			.from(taskBlockedPeriods)
			.where(
				and(
					eq(taskBlockedPeriods.taskId, created.id),
					isNull(taskBlockedPeriods.unblockedAt),
				),
			);
		expect(openPeriods).toHaveLength(1);
	});

	it("reverte o desbloqueio quando não existe período aberto", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		await db
			.update(tasks)
			.set({ blocked: true })
			.where(eq(tasks.id, created.id));

		await expect(
			drizzleTaskRepository.setBlockedWithHistory(created.id, false),
		).rejects.toThrow("Não há período de bloqueio aberto");
		expect((await drizzleTaskRepository.findById(created.id))?.blocked).toBe(
			true,
		);
	});

	it("atualiza, conta por tipo e exclui a task", async () => {
		const created = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		const updated = await drizzleTaskRepository.update(created.id, {
			externalId: "TASK-1",
			description: "Nova descrição",
			typeId,
			assigneeId: null,
			dueDate: "2026-08-01",
			parentTaskId: null,
		});
		expect(updated.description).toBe("Nova descrição");
		expect(await drizzleTaskRepository.countByType(typeId)).toBe(1);

		await drizzleTaskRepository.delete(created.id);
		expect(await drizzleTaskRepository.findById(created.id)).toBeNull();
	});

	it("informa uso por time e responsável", async () => {
		const assigneeId = "33333333-3333-3333-3333-333333333333";
		await drizzleTaskRepository.createWithInitialHistory(
			baseData({ assigneeId }),
		);

		expect(
			await drizzleTaskRepository.hasTasksForTeam(
				"11111111-1111-1111-1111-111111111111",
			),
		).toBe(true);
		expect(
			await drizzleTaskRepository.hasTasksForTeam(
				"22222222-2222-2222-2222-222222222222",
			),
		).toBe(false);
		expect(await drizzleTaskRepository.hasTasksForAssignee(assigneeId)).toBe(
			true,
		);
		expect(
			await drizzleTaskRepository.hasTasksForAssignee(
				"44444444-4444-4444-4444-444444444444",
			),
		).toBe(false);
	});

	it("lista ids de tipos usados sem duplicatas", async () => {
		await drizzleTaskRepository.createWithInitialHistory(baseData());
		await drizzleTaskRepository.createWithInitialHistory(
			baseData({ externalId: "TASK-2" }),
		);

		expect(await drizzleTaskRepository.listUsedTypeIds()).toEqual([typeId]);
	});

	it("conta tasks associadas a uma tarja", async () => {
		const tag = await drizzleTagRepository.create("Cliente Acme", "#2563eb");
		const task = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		await db.insert(taskTags).values({ taskId: task.id, tagId: tag.id });
		try {
			expect(await drizzleTaskRepository.countByTag(tag.id)).toBe(1);
		} finally {
			await resetTasksTable();
			await drizzleTagRepository.delete(tag.id);
		}
	});

	it("lista os ids de tarja em uso", async () => {
		const tag = await drizzleTagRepository.create("Cliente Acme", "#2563eb");
		const task = await drizzleTaskRepository.createWithInitialHistory(
			baseData(),
		);
		await db.insert(taskTags).values({ taskId: task.id, tagId: tag.id });
		try {
			expect(await drizzleTaskRepository.listUsedTagIds()).toEqual([tag.id]);
		} finally {
			await resetTasksTable();
			await drizzleTagRepository.delete(tag.id);
		}
	});

	it("grava as tarjas informadas ao criar a task", async () => {
		const tag = await drizzleTagRepository.create("Cliente Acme", "#2563eb");
		const task = await drizzleTaskRepository.createWithInitialHistory(
			baseData({ tagIds: [tag.id] }),
		);
		try {
			expect(await drizzleTaskRepository.listTagIdsForTasks([task.id])).toEqual(
				{ [task.id]: [tag.id] },
			);
		} finally {
			await resetTasksTable();
			await drizzleTagRepository.delete(tag.id);
		}
	});

	it("substitui as tarjas ao atualizar a task", async () => {
		const tagA = await drizzleTagRepository.create("A", "#2563eb");
		const tagB = await drizzleTagRepository.create("B", "#dc2626");
		const task = await drizzleTaskRepository.createWithInitialHistory(
			baseData({ tagIds: [tagA.id] }),
		);
		try {
			await drizzleTaskRepository.update(task.id, {
				externalId: task.externalId,
				description: task.description,
				typeId: task.typeId,
				assigneeId: task.assigneeId,
				dueDate: task.dueDate,
				parentTaskId: task.parentTaskId,
				tagIds: [tagB.id],
			});
			expect(await drizzleTaskRepository.listTagIdsForTasks([task.id])).toEqual(
				{ [task.id]: [tagB.id] },
			);
		} finally {
			await resetTasksTable();
			await drizzleTagRepository.delete(tagA.id);
			await drizzleTagRepository.delete(tagB.id);
		}
	});

	it("mantém as tarjas quando a atualização não informa tagIds", async () => {
		const tag = await drizzleTagRepository.create("Cliente Acme", "#2563eb");
		const task = await drizzleTaskRepository.createWithInitialHistory(
			baseData({ tagIds: [tag.id] }),
		);
		try {
			await drizzleTaskRepository.update(task.id, {
				externalId: task.externalId,
				description: "Descrição atualizada",
				typeId: task.typeId,
				assigneeId: task.assigneeId,
				dueDate: task.dueDate,
				parentTaskId: task.parentTaskId,
			});
			expect(await drizzleTaskRepository.listTagIdsForTasks([task.id])).toEqual(
				{ [task.id]: [tag.id] },
			);
		} finally {
			await resetTasksTable();
			await drizzleTagRepository.delete(tag.id);
		}
	});
});
