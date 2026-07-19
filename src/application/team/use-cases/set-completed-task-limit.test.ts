import { describe, expect, it } from "vitest";
import { setCompletedTaskLimit } from "./set-completed-task-limit";
import { createFakeTeamRepository } from "./test-helpers/create-fake-team-repository";

describe("setCompletedTaskLimit", () => {
	it("altera o limite de tarefas concluídas do time", async () => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");

		const updated = await setCompletedTaskLimit(repository, team.id, 3);

		expect(updated.completedTaskLimit).toBe(3);
	});

	it.each([0, -1, 1.5])("rejeita limite inválido: %s", async (limit) => {
		const repository = createFakeTeamRepository();
		const team = await repository.create("Time A");

		await expect(
			setCompletedTaskLimit(repository, team.id, limit),
		).rejects.toThrow(
			"Limite de tarefas concluídas deve ser um número inteiro positivo",
		);
	});
});
