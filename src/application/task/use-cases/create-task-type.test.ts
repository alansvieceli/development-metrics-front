import { describe, expect, it } from "vitest";
import { createTaskType } from "./create-task-type";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

describe("createTaskType", () => {
	it("cria um tipo com nome e cor informados", async () => {
		const repository = createFakeTaskTypeRepository();
		const taskType = await createTaskType(repository, "Épico", "#2563eb");
		expect(taskType.name).toBe("Épico");
		expect(taskType.color).toBe("#2563eb");
		expect(taskType.isBug).toBe(false);
	});

	it("marca isBug automaticamente quando o nome é Bug", async () => {
		const repository = createFakeTaskTypeRepository();
		const taskType = await createTaskType(repository, " bug ", "#dc2626");
		expect(taskType.isBug).toBe(true);
	});

	it("rejeita nome vazio", async () => {
		const repository = createFakeTaskTypeRepository();
		await expect(createTaskType(repository, "  ", "#2563eb")).rejects.toThrow(
			"Nome do tipo não pode ser vazio",
		);
	});

	it("rejeita cor fora do formato hexadecimal", async () => {
		const repository = createFakeTaskTypeRepository();
		await expect(createTaskType(repository, "Épico", "azul")).rejects.toThrow(
			"Cor deve ser um hexadecimal válido, ex: #2563eb",
		);
	});
});
