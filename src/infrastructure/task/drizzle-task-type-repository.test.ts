import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { taskTypes } from "./drizzle/schema";
import { drizzleTaskTypeRepository } from "./drizzle-task-type-repository";

async function deleteTaskType(typeId: string) {
	await db.delete(taskTypes).where(eq(taskTypes.id, typeId));
}

describe("drizzleTaskTypeRepository", () => {
	afterEach(async () => {
		// Não trunca a tabela inteira: `task_types` carrega o seed padrão
		// (Task 9), consumido por outros testes. Cada teste remove apenas o
		// que criou.
	});

	it("cria e busca um tipo por id", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		try {
			const found = await drizzleTaskTypeRepository.findById(created.id);
			expect(found).toEqual(created);
		} finally {
			await deleteTaskType(created.id);
		}
	});

	it("retorna null ao buscar um tipo inexistente", async () => {
		expect(
			await drizzleTaskTypeRepository.findById(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});

	it("atualiza nome e cor", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		try {
			const updated = await drizzleTaskTypeRepository.update(
				created.id,
				"Épico Grande",
				"#64748b",
			);
			expect(updated.name).toBe("Épico Grande");
			expect(updated.color).toBe("#64748b");
		} finally {
			await deleteTaskType(created.id);
		}
	});

	it("lista os tipos incluindo os criados no teste", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		try {
			const all = await drizzleTaskTypeRepository.listAll();
			expect(all.map((t) => t.id)).toContain(created.id);
		} finally {
			await deleteTaskType(created.id);
		}
	});

	it("exclui um tipo", async () => {
		const created = await drizzleTaskTypeRepository.create("Épico", "#2563eb");
		await drizzleTaskTypeRepository.delete(created.id);
		expect(await drizzleTaskTypeRepository.findById(created.id)).toBeNull();
	});
});
