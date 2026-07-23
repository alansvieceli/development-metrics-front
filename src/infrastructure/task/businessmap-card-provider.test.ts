import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import cardDetails from "./__fixtures__/businessmap-card-415931-details.json";
import columns from "./__fixtures__/businessmap-board-108-columns.json";
import revision1 from "./__fixtures__/businessmap-card-415931-revision-1.json";
import revision9 from "./__fixtures__/businessmap-card-415931-revision-9.json";
import revision10 from "./__fixtures__/businessmap-card-415931-revision-10.json";
import revisions from "./__fixtures__/businessmap-card-415931-revisions-trimmed.json";
import user from "./__fixtures__/businessmap-user-1460.json";
import { businessmapCardProvider } from "./businessmap-card-provider";

function jsonResponse(body: unknown) {
	return new Response(JSON.stringify(body), { status: 200 });
}

describe("businessmapCardProvider", () => {
	beforeEach(() => {
		process.env.BUSINESSMAP_COMPANY_NAME = "dasa";
		process.env.BUSINESSMAP_API_KEY = "fake-key";
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) => {
				if (url.endsWith("/revisions/1")) return jsonResponse(revision1);
				if (url.endsWith("/revisions/9")) return jsonResponse(revision9);
				if (url.endsWith("/revisions/10")) return jsonResponse(revision10);
				if (url.endsWith("/revisions")) return jsonResponse(revisions);
				if (url.endsWith("/boards/108/columns")) return jsonResponse(columns);
				if (url.endsWith("/users/1460")) return jsonResponse(user);
				if (url.endsWith("/cards/415931")) return jsonResponse(cardDetails);
				throw new Error(`URL não mockada: ${url}`);
			}),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it("busca card, reconstrói o histórico de colunas e resolve o responsável", async () => {
		const card = await businessmapCardProvider.fetchCard("415931");

		expect(card.externalId).toBe("415931");
		expect(card.ownerName).toBe("jose.hudson.ext");
		expect(card.dueDate).toBe("2026-10-29");
		expect(card.steps).toEqual([
			{ columnLabel: "Backlog", changedAt: new Date("2026-06-10T17:48:37Z") },
			{
				columnLabel: "Refinamento.Pronto para Desenvolvimento",
				changedAt: new Date("2026-06-10T17:48:50+00:00"),
			},
			{
				columnLabel: "Desenvolvimento.Em Andamento",
				changedAt: new Date("2026-07-20T17:00:38+00:00"),
			},
		]);
	});

	it("lança erro quando falta a env var da company name", async () => {
		process.env.BUSINESSMAP_COMPANY_NAME = "";
		await expect(businessmapCardProvider.fetchCard("415931")).rejects.toThrow(
			"BUSINESSMAP_COMPANY_NAME não configurado",
		);
	});
});
