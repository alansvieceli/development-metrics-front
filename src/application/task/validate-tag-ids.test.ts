import { describe, expect, it } from "vitest";
import { createFakeTagRepository } from "@/application/task/use-cases/test-helpers/create-fake-tag-repository";
import { validateTagIds } from "./validate-tag-ids";

describe("validateTagIds", () => {
	it("aceita de 0 a 3 tarjas existentes", async () => {
		const repository = createFakeTagRepository();
		const tagA = await repository.create("A", "#2563eb");
		const tagB = await repository.create("B", "#dc2626");
		await expect(validateTagIds(repository, [])).resolves.toBeUndefined();
		await expect(
			validateTagIds(repository, [tagA.id, tagB.id]),
		).resolves.toBeUndefined();
	});

	it("rejeita mais de 3 tarjas", async () => {
		const repository = createFakeTagRepository();
		const ids = await Promise.all(
			["A", "B", "C", "D"].map(async (name) => {
				const tag = await repository.create(name, "#2563eb");
				return tag.id;
			}),
		);
		await expect(validateTagIds(repository, ids)).rejects.toThrow(
			"Uma task pode ter no máximo 3 tarjas",
		);
	});

	it("rejeita tarja inexistente", async () => {
		const repository = createFakeTagRepository();
		await expect(validateTagIds(repository, ["missing"])).rejects.toThrow(
			"Tarja não encontrada",
		);
	});
});
