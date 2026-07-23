import { describe, expect, it } from "vitest";
import { createFakeTagRepository } from "./test-helpers/create-fake-tag-repository";
import { updateTag } from "./update-tag";

describe("updateTag", () => {
	it("atualiza nome e cor de uma tarja existente", async () => {
		const repository = createFakeTagRepository();
		const tag = await repository.create("Cliente Acme", "#2563eb");
		const updated = await updateTag(
			repository,
			tag.id,
			"Cliente Globex",
			"#0891b2",
		);
		expect(updated.name).toBe("Cliente Globex");
		expect(updated.color).toBe("#0891b2");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTagRepository();
		const tag = await repository.create("Cliente Acme", "#2563eb");
		await expect(
			updateTag(repository, tag.id, "  ", "#2563eb"),
		).rejects.toThrow("Nome da tarja não pode ser vazio");
	});

	it("rejeita cor fora do formato hexadecimal", async () => {
		const repository = createFakeTagRepository();
		const tag = await repository.create("Cliente Acme", "#2563eb");
		await expect(
			updateTag(repository, tag.id, "Cliente Acme", "azul"),
		).rejects.toThrow("Cor deve ser um hexadecimal válido, ex: #2563eb");
	});
});
