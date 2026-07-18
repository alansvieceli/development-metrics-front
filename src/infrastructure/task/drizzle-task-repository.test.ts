import { sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { drizzleTaskRepository } from "./drizzle-task-repository";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";

async function resetTasksTable() {
	await db.execute(
		sql`TRUNCATE TABLE task_blocked_periods, task_status_changes, tasks RESTART IDENTITY CASCADE`,
	);
}

describe("drizzleTaskRepository", () => {
	let typeId: string;

	beforeEach(async () => {
		const taskType = await drizzleTaskTypeRepository.create("Bug", "#dc2626");
		typeId = taskType.id;
	});

	afterEach(async () => {
		await resetTasksTable();
		await drizzleTaskTypeRepository.delete(typeId);
	});

	function baseData(
		overrides: Partial<Parameters<typeof drizzleTaskRepository.create>[0]> = {},
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

	it("cria e busca uma task por id", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const found = await drizzleTaskRepository.findById(created.id);
		expect(found).toEqual(created);
		expect(found?.blocked).toBe(false);
	});

	it("busca por id externo dentro do time", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const found = await drizzleTaskRepository.findByExternalId(
			created.teamId,
			"TASK-1",
		);
		expect(found?.id).toBe(created.id);
	});

	it("lista as tasks de um time", async () => {
		await drizzleTaskRepository.create(baseData());
		await drizzleTaskRepository.create(
			baseData({
				externalId: "TASK-2",
				teamId: "22222222-2222-2222-2222-222222222222",
			}),
		);
		const list = await drizzleTaskRepository.listByTeam(
			"11111111-1111-1111-1111-111111111111",
		);
		expect(list.map((t) => t.externalId)).toEqual(["TASK-1"]);
	});

	it("atualiza o status", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const updated = await drizzleTaskRepository.updateStatus(
			created.id,
			"IN_DEVELOPMENT",
		);
		expect(updated.status).toBe("IN_DEVELOPMENT");
	});

	it("atualiza o campo bloqueado", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const updated = await drizzleTaskRepository.updateBlocked(created.id, true);
		expect(updated.blocked).toBe(true);
	});

	it("atualiza os campos editáveis", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		const updated = await drizzleTaskRepository.update(created.id, {
			externalId: "TASK-1",
			description: "Nova descrição",
			typeId,
			assigneeId: null,
			dueDate: "2026-08-01",
		});
		expect(updated.description).toBe("Nova descrição");
		expect(updated.dueDate).toBe("2026-08-01");
	});

	it("conta as tasks de um tipo", async () => {
		await drizzleTaskRepository.create(baseData());
		expect(await drizzleTaskRepository.countByType(typeId)).toBe(1);
	});

	it("exclui uma task", async () => {
		const created = await drizzleTaskRepository.create(baseData());
		await drizzleTaskRepository.delete(created.id);
		expect(await drizzleTaskRepository.findById(created.id)).toBeNull();
	});
});
