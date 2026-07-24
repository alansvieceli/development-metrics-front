import { describe, expect, it } from "vitest";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";
import { diffColumnWithBusinessmap } from "./diff-column-with-businessmap";

describe("diffColumnWithBusinessmap", () => {
	it("separa ids batendo, só locais e só no Businessmap para o status pedido", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Desenvolvimento.Em Andamento" },
			{ externalId: "2", columnLabel: "Desenvolvimento.Em Andamento" },
			{ externalId: "3", columnLabel: "Testes.Para Testar" },
		]);

		const result = await diffColumnWithBusinessmap(
			provider,
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

		const result = await diffColumnWithBusinessmap(provider, "TODO", []);

		expect(result).toEqual({ matched: [], onlyLocal: [], onlyBusinessmap: [] });
	});

	it("retorna tudo batendo quando as listas são idênticas", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedBoardCards([
			{ externalId: "1", columnLabel: "Backlog" },
			{ externalId: "2", columnLabel: "Card created" },
		]);

		const result = await diffColumnWithBusinessmap(provider, "TODO", [
			"1",
			"2",
		]);

		expect(result).toEqual({
			matched: ["1", "2"],
			onlyLocal: [],
			onlyBusinessmap: [],
		});
	});
});
