import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "@/application/team/use-cases/test-helpers/create-fake-team-repository";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";
import { previewCardImport } from "./preview-card-import";

async function setup() {
	const provider = createFakeExternalCardProvider();
	const teamRepository = createFakeTeamRepository();
	const team = await teamRepository.create("Time 1");
	const member = await teamRepository.addMember(team.id, "Bruno Pajtak");
	return { provider, teamRepository, teamId: team.id, memberId: member.id };
}

describe("previewCardImport", () => {
	it("monta o preview traduzindo histórico e resolvendo responsável", async () => {
		const { provider, teamRepository, teamId, memberId } = await setup();
		provider.seed("415931", {
			externalId: "415931",
			description: "Implementação de link direto",
			ownerName: "Bruno Pajtak",
			dueDate: "2026-10-29",
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-10") },
				{
					columnLabel: "Desenvolvimento.Em Andamento",
					changedAt: new Date("2026-07-20"),
				},
			],
		});

		const preview = await previewCardImport(
			provider,
			teamRepository,
			teamId,
			"415931",
		);

		expect(preview.externalId).toBe("415931");
		expect(preview.dueDate).toBe("2026-10-29");
		expect(preview.resolvedAssigneeId).toBe(memberId);
		expect(preview.warnings).toEqual([]);
		expect(preview.steps).toEqual([
			{ status: "TODO", date: "2026-06-10" },
			{ status: "IN_DEVELOPMENT", date: "2026-07-20" },
		]);
	});

	it("rejeita etapa que não mapeia para nenhum status conhecido", async () => {
		const { provider, teamRepository, teamId } = await setup();
		provider.seed("2", {
			externalId: "2",
			description: "Card com refinamento",
			ownerName: null,
			dueDate: "2026-08-01",
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-01") },
				{
					columnLabel: "Refinamento.Refinamento Funcional",
					changedAt: new Date("2026-06-02"),
				},
			],
		});

		await expect(
			previewCardImport(provider, teamRepository, teamId, "2"),
		).rejects.toThrow(
			'Não foi possível mapear a etapa "Refinamento.Refinamento Funcional" para um status conhecido',
		);
	});

	it("rejeita card sem deadline", async () => {
		const { provider, teamRepository, teamId } = await setup();
		provider.seed("3", {
			externalId: "3",
			description: "Sem deadline",
			ownerName: null,
			dueDate: null,
			steps: [{ columnLabel: "Card created", changedAt: new Date("2026-06-01") }],
		});

		await expect(
			previewCardImport(provider, teamRepository, teamId, "3"),
		).rejects.toThrow("O card não possui deadline definido no Businessmap");
	});

	it("adiciona aviso quando o responsável não é encontrado no time", async () => {
		const { provider, teamRepository, teamId } = await setup();
		provider.seed("4", {
			externalId: "4",
			description: "Owner desconhecido",
			ownerName: "jose.hudson.ext",
			dueDate: "2026-08-01",
			steps: [{ columnLabel: "Card created", changedAt: new Date("2026-06-01") }],
		});

		const preview = await previewCardImport(provider, teamRepository, teamId, "4");

		expect(preview.resolvedAssigneeId).toBeNull();
		expect(preview.warnings).toEqual([
			'Responsável "jose.hudson.ext" não encontrado entre os membros do time; será importado sem responsável',
		]);
	});

	it("rejeita id de card vazio", async () => {
		const { provider, teamRepository, teamId } = await setup();
		await expect(
			previewCardImport(provider, teamRepository, teamId, "  "),
		).rejects.toThrow("Id do card é obrigatório");
	});
});
