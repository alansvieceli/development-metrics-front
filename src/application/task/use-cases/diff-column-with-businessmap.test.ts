import { describe, expect, it } from "vitest";
import { createFakeTeamRepository } from "@/application/team/use-cases/test-helpers/create-fake-team-repository";
import { diffColumnWithBusinessmap } from "./diff-column-with-businessmap";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";

async function seedTeamWithBoardId() {
	const teamRepository = createFakeTeamRepository();
	const team = await teamRepository.create("Time A");
	await teamRepository.setBusinessmapBoardId(team.id, "108");
	return { teamRepository, teamId: team.id };
}

describe("diffColumnWithBusinessmap", () => {
	it("separa ids batendo, só locais e só no Businessmap para o status pedido", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Desenvolvimento.Em Andamento" },
			{ externalId: "2", columnLabel: "Desenvolvimento.Em Andamento" },
			{ externalId: "3", columnLabel: "Testes.Para Testar" },
		]);
		const { teamRepository, teamId } = await seedTeamWithBoardId();

		const result = await diffColumnWithBusinessmap(
			provider,
			teamRepository,
			teamId,
			"IN_DEVELOPMENT",
			["1", "4"],
		);

		expect(result).toEqual({
			matched: ["1"],
			onlyLocal: ["4"],
			onlyBusinessmap: ["2"],
		});
	});

	it("ignora cards do Businessmap cuja coluna não mapeia para nenhum status", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Refinamento.Refinamento Técnico" },
		]);
		const { teamRepository, teamId } = await seedTeamWithBoardId();

		const result = await diffColumnWithBusinessmap(
			provider,
			teamRepository,
			teamId,
			"TODO",
			[],
		);

		expect(result).toEqual({ matched: [], onlyLocal: [], onlyBusinessmap: [] });
	});

	it("retorna tudo batendo quando as listas são idênticas", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Backlog" },
			{ externalId: "2", columnLabel: "Card created" },
		]);
		const { teamRepository, teamId } = await seedTeamWithBoardId();

		const result = await diffColumnWithBusinessmap(
			provider,
			teamRepository,
			teamId,
			"TODO",
			["1", "2"],
		);

		expect(result).toEqual({
			matched: ["1", "2"],
			onlyLocal: [],
			onlyBusinessmap: [],
		});
	});

	it("lança erro quando o time não tem id de quadro Businessmap configurado", async () => {
		const provider = createFakeExternalCardProvider();
		const teamRepository = createFakeTeamRepository();
		const team = await teamRepository.create("Time A");

		await expect(
			diffColumnWithBusinessmap(provider, teamRepository, team.id, "TODO", []),
		).rejects.toThrow(
			"Id do quadro Businessmap não configurado para este time",
		);
	});
});
