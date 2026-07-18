import { describe, expect, it } from "vitest";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";
import { updateTaskType } from "./update-task-type";

describe("updateTaskType", () => {
	it("atualiza nome e cor de um tipo existente", async () => {
		const repository = createFakeTaskTypeRepository();
		const taskType = await repository.create("Épico", "#2563eb");
		const updated = await updateTaskType(
			repository,
			taskType.id,
			"Épico Grande",
			"#64748b",
		);
		expect(updated.name).toBe("Épico Grande");
		expect(updated.color).toBe("#64748b");
	});

	it("rejeita cor fora do formato hexadecimal", async () => {
		const repository = createFakeTaskTypeRepository();
		const taskType = await repository.create("Épico", "#2563eb");
		await expect(
			updateTaskType(repository, taskType.id, "Épico", "azul"),
		).rejects.toThrow("Cor deve ser um hexadecimal válido, ex: #2563eb");
	});
});
