import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/infrastructure/db/client";
import { tags } from "./drizzle/schema";
import { drizzleTagRepository } from "./drizzle-tag-repository";

async function deleteTag(tagId: string) {
	await db.delete(tags).where(eq(tags.id, tagId));
}

describe("drizzleTagRepository", () => {
	it("cria e busca uma tarja por id", async () => {
		const created = await drizzleTagRepository.create(
			"Cliente Acme",
			"#2563eb",
		);
		try {
			const found = await drizzleTagRepository.findById(created.id);
			expect(found).toEqual(created);
		} finally {
			await deleteTag(created.id);
		}
	});

	it("retorna null ao buscar uma tarja inexistente", async () => {
		expect(
			await drizzleTagRepository.findById(
				"00000000-0000-0000-0000-000000000000",
			),
		).toBeNull();
	});

	it("atualiza nome e cor", async () => {
		const created = await drizzleTagRepository.create(
			"Cliente Acme",
			"#2563eb",
		);
		try {
			const updated = await drizzleTagRepository.update(
				created.id,
				"Cliente Globex",
				"#0891b2",
			);
			expect(updated.name).toBe("Cliente Globex");
			expect(updated.color).toBe("#0891b2");
		} finally {
			await deleteTag(created.id);
		}
	});

	it("lista as tarjas incluindo as criadas no teste", async () => {
		const created = await drizzleTagRepository.create(
			"Cliente Acme",
			"#2563eb",
		);
		try {
			const all = await drizzleTagRepository.listAll();
			expect(all.map((t) => t.id)).toContain(created.id);
		} finally {
			await deleteTag(created.id);
		}
	});

	it("exclui uma tarja", async () => {
		const created = await drizzleTagRepository.create(
			"Cliente Acme",
			"#2563eb",
		);
		await drizzleTagRepository.delete(created.id);
		expect(await drizzleTagRepository.findById(created.id)).toBeNull();
	});
});
