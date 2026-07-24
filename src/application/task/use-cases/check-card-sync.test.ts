import { describe, expect, it } from "vitest";
import { createFakeExternalCardProvider } from "./test-helpers/create-fake-external-card-provider";
import { checkCardSync } from "./check-card-sync";

describe("checkCardSync", () => {
	it("retorna inSync=true quando a coluna atual do Businessmap mapeia para o mesmo status local", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedColumn("415931", {
			columnLabel: "Desenvolvimento.Em Andamento",
		});

		const result = await checkCardSync(provider, "415931", "IN_DEVELOPMENT");

		expect(result).toEqual({
			found: true,
			businessmapColumnLabel: "Desenvolvimento.Em Andamento",
			businessmapStatus: "IN_DEVELOPMENT",
			inSync: true,
		});
	});

	it("retorna inSync=false quando os status divergem", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedColumn("415931", { columnLabel: "Testes.Para Testar" });

		const result = await checkCardSync(provider, "415931", "IN_DEVELOPMENT");

		expect(result).toEqual({
			found: true,
			businessmapColumnLabel: "Testes.Para Testar",
			businessmapStatus: "TESTING",
			inSync: false,
		});
	});

	it("retorna businessmapStatus=null quando a coluna não mapeia para nenhum status conhecido", async () => {
		const provider = createFakeExternalCardProvider();
		provider.seedColumn("415931", {
			columnLabel: "Refinamento.Refinamento Técnico",
		});

		const result = await checkCardSync(provider, "415931", "TODO");

		expect(result).toEqual({
			found: true,
			businessmapColumnLabel: "Refinamento.Refinamento Técnico",
			businessmapStatus: null,
			inSync: false,
		});
	});

	it("retorna found=false quando o card não existe no Businessmap", async () => {
		const provider = createFakeExternalCardProvider();

		const result = await checkCardSync(provider, "999999", "TODO");

		expect(result).toEqual({ found: false });
	});
});
