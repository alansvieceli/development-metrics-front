import { and, eq, isNull, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { taskBlockedPeriods, taskStatusChanges, tasks } from "./drizzle/schema";
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
		const taskType = await drizzleTaskTypeRepository.create("Bug", "#dc2626");
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
			dueDate: null,
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
});
