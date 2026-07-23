import { describe, expect, it } from "vitest";
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import { importCard } from "./import-card";
import { createFakeTaskRepository } from "./test-helpers/create-fake-task-repository";
import { createFakeTaskTypeRepository } from "./test-helpers/create-fake-task-type-repository";

const basePreview: CardImportPreview = {
	externalId: "415931",
	description: "Implementação de link direto",
	dueDate: "2026-10-29",
	ownerName: "Bruno Pajtak",
	resolvedAssigneeId: null,
	typeName: "História de Negócio",
	resolvedTypeId: null,
	blocked: false,
	steps: [{ status: "TODO", date: "2026-06-10" }],
	warnings: [],
};

async function setup() {
	const repository = createFakeTaskRepository();
	const typeRepository = createFakeTaskTypeRepository();
	const type = await typeRepository.create(
		"História de Negócio",
		"#42af49",
		false,
	);
	const teamAccess = {
		teamExists: async (teamId: string) => teamId === "team-1",
		memberBelongsToTeam: async () => true,
	};
	return { repository, typeRepository, teamAccess, typeId: type.id };
}

describe("importCard", () => {
	it("cria a task com o histórico traduzido", async () => {
		const { repository, typeRepository, teamAccess, typeId } = await setup();

		const task = await importCard(
			repository,
			typeRepository,
			teamAccess,
			"team-1",
			basePreview,
			typeId,
		);

		expect(task.externalId).toBe("415931");
		expect(task.status).toBe("TODO");
		expect(task.blocked).toBe(false);
	});

	it("bloqueia a task após criar quando o card do Businessmap está bloqueado", async () => {
		const { repository, typeRepository, teamAccess, typeId } = await setup();

		const task = await importCard(
			repository,
			typeRepository,
			teamAccess,
			"team-1",
			{
				...basePreview,
				blocked: true,
			},
			typeId,
		);

		expect(task.blocked).toBe(true);
		expect(repository.blockedPeriods).toEqual([
			expect.objectContaining({ taskId: task.id, unblockedAt: null }),
		]);
	});
});
