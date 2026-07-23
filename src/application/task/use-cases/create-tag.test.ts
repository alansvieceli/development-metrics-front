import { describe, expect, it } from "vitest";
import { createTag } from "./create-tag";
import { createFakeTagRepository } from "./test-helpers/create-fake-tag-repository";

describe("createTag", () => {
	it("cria uma tarja com nome e cor informados", async () => {
		const repository = createFakeTagRepository();
		const tag = await createTag(repository, "Cliente Acme", "#2563eb");
		expect(tag.name).toBe("Cliente Acme");
		expect(tag.color).toBe("#2563eb");
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTagRepository();
		await expect(createTag(repository, "  ", "#2563eb")).rejects.toThrow(
			"Nome da tarja não pode ser vazio",
		);
	});

	it("rejeita cor fora do formato hexadecimal", async () => {
		const repository = createFakeTagRepository();
		await expect(
			createTag(repository, "Cliente Acme", "azul"),
		).rejects.toThrow("Cor deve ser um hexadecimal válido, ex: #2563eb");
	});
});
