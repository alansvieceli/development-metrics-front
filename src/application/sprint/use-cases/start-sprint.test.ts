import { describe, expect, it } from "vitest";
import { createFakeSprintRepository } from "./test-helpers/create-fake-sprint-repository";
import { startSprint } from "./start-sprint";

describe("startSprint", () => {
	it("inicia a sprint planejada de startDate mais próxima", async () => {
		const repository = createFakeSprintRepository();
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 2",
			startDate: "2026-07-15",
			endDate: "2026-07-28",
		});
		const first = await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 1",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});

		const started = await startSprint(repository, "team-1");

		expect(started.id).toBe(first.id);
		expect(started.status).toBe("ACTIVE");
	});

	it("rejeita quando já existe sprint ativa no time", async () => {
		const repository = createFakeSprintRepository();
		const active = await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint ativa",
			startDate: "2026-07-01",
			endDate: "2026-07-14",
		});
		await repository.updateStatus(active.id, "ACTIVE");
		await repository.create({
			piId: "pi-1",
			teamId: "team-1",
			name: "Sprint 2",
			startDate: "2026-07-15",
			endDate: "2026-07-28",
		});

		await expect(startSprint(repository, "team-1")).rejects.toThrow(
			"Já existe uma sprint ativa para este time",
		);
	});

	it("rejeita quando não há sprint planejada para iniciar", async () => {
		const repository = createFakeSprintRepository();
		await expect(startSprint(repository, "team-1")).rejects.toThrow(
			"Não há sprint planejada para iniciar",
		);
	});
});
