import { describe, expect, it } from "vitest";
import { createFakeTaskTypeRepository } from "@/application/task/use-cases/test-helpers/create-fake-task-type-repository";
import { createFakeTeamRepository } from "@/application/team/use-cases/test-helpers/create-fake-team-repository";
import { previewCardImport } from "./preview-card-import";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";

async function setup() {
	const provider = createFakeExternalCardProvider();
	const teamRepository = createFakeTeamRepository();
	const typeRepository = createFakeTaskTypeRepository();
	const team = await teamRepository.create("Time 1");
	const member = await teamRepository.addMember(team.id, "Bruno Pajtak");
	const taskType = await typeRepository.create(
		"História de Negócio",
		"#42af49",
		false,
	);
	return {
		provider,
		teamRepository,
		typeRepository,
		teamId: team.id,
		memberId: member.id,
		typeId: taskType.id,
	};
}

describe("previewCardImport", () => {
	it("monta o preview traduzindo histórico, resolvendo responsável e tipo", async () => {
		const {
			provider,
			teamRepository,
			typeRepository,
			teamId,
			memberId,
			typeId,
		} = await setup();
		provider.seed("415931", {
			externalId: "415931",
			description: "Implementação de link direto",
			ownerName: "Bruno Pajtak",
			typeName: "História de Negócio",
			dueDate: "2026-10-29",
			blocked: false,
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
			typeRepository,
			teamId,
			"415931",
		);

		expect(preview.externalId).toBe("415931");
		expect(preview.dueDate).toBe("2026-10-29");
		expect(preview.resolvedAssigneeId).toBe(memberId);
		expect(preview.resolvedTypeId).toBe(typeId);
		expect(preview.blocked).toBe(false);
		expect(preview.warnings).toEqual([]);
		expect(preview.steps).toEqual([
			{ status: "TODO", date: "2026-06-10" },
			{ status: "IN_DEVELOPMENT", date: "2026-07-20" },
		]);
	});

	it("rejeita etapa que não mapeia para nenhum status conhecido", async () => {
		const { provider, teamRepository, typeRepository, teamId } = await setup();
		provider.seed("2", {
			externalId: "2",
			description: "Card com refinamento",
			ownerName: null,
			typeName: null,
			dueDate: "2026-08-01",
			blocked: false,
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-01") },
				{
					columnLabel: "Refinamento.Refinamento Funcional",
					changedAt: new Date("2026-06-02"),
				},
			],
		});

		await expect(
			previewCardImport(provider, teamRepository, typeRepository, teamId, "2"),
		).rejects.toThrow(
			'Não foi possível mapear a etapa "Refinamento.Refinamento Funcional" para um status conhecido',
		);
	});

	it("rejeita card sem deadline", async () => {
		const { provider, teamRepository, typeRepository, teamId } = await setup();
		provider.seed("3", {
			externalId: "3",
			description: "Sem deadline",
			ownerName: null,
			typeName: null,
			dueDate: null,
			blocked: false,
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-01") },
			],
		});

		await expect(
			previewCardImport(provider, teamRepository, typeRepository, teamId, "3"),
		).rejects.toThrow("O card não possui deadline definido no Businessmap");
	});

	it("adiciona aviso quando o responsável não é encontrado no time", async () => {
		const { provider, teamRepository, typeRepository, teamId } = await setup();
		provider.seed("4", {
			externalId: "4",
			description: "Owner desconhecido",
			ownerName: "jose.hudson.ext",
			typeName: null,
			dueDate: "2026-08-01",
			blocked: false,
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-01") },
			],
		});

		const preview = await previewCardImport(
			provider,
			teamRepository,
			typeRepository,
			teamId,
			"4",
		);

		expect(preview.resolvedAssigneeId).toBeNull();
		expect(preview.warnings).toContain(
			'Responsável "jose.hudson.ext" não encontrado entre os membros do time; será importado sem responsável',
		);
	});

	it("adiciona aviso quando o tipo não é encontrado entre os tipos existentes", async () => {
		const { provider, teamRepository, typeRepository, teamId } = await setup();
		provider.seed("5", {
			externalId: "5",
			description: "Tipo desconhecido",
			ownerName: null,
			typeName: "Bug de Produção",
			dueDate: "2026-08-01",
			blocked: false,
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-01") },
			],
		});

		const preview = await previewCardImport(
			provider,
			teamRepository,
			typeRepository,
			teamId,
			"5",
		);

		expect(preview.resolvedTypeId).toBeNull();
		expect(preview.warnings).toContain(
			'Tipo "Bug de Produção" não encontrado entre os tipos existentes; selecione manualmente',
		);
	});

	it("propaga o bloqueio do card do Businessmap", async () => {
		const { provider, teamRepository, typeRepository, teamId } = await setup();
		provider.seed("6", {
			externalId: "6",
			description: "Card bloqueado",
			ownerName: null,
			typeName: null,
			dueDate: "2026-08-01",
			blocked: true,
			steps: [
				{ columnLabel: "Card created", changedAt: new Date("2026-06-01") },
			],
		});

		const preview = await previewCardImport(
			provider,
			teamRepository,
			typeRepository,
			teamId,
			"6",
		);

		expect(preview.blocked).toBe(true);
	});

	it("rejeita id de card vazio", async () => {
		const { provider, teamRepository, typeRepository, teamId } = await setup();
		await expect(
			previewCardImport(provider, teamRepository, typeRepository, teamId, "  "),
		).rejects.toThrow("Id do card é obrigatório");
	});
});
