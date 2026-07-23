import { describe, expect, it } from "vitest";
import { matchExternalStatus } from "./match-external-status";

describe("matchExternalStatus", () => {
	it("mapeia 'Card created' para TODO", () => {
		expect(matchExternalStatus("Card created")).toBe("TODO");
	});

	it("mapeia 'Desenvolvimento.Em Andamento' para IN_DEVELOPMENT", () => {
		expect(matchExternalStatus("Desenvolvimento.Em Andamento")).toBe(
			"IN_DEVELOPMENT",
		);
	});

	it("mapeia 'Desenvolvimento.Para Code Review' para CODE_REVIEW, não IN_DEVELOPMENT", () => {
		expect(matchExternalStatus("Desenvolvimento.Para Code Review")).toBe(
			"CODE_REVIEW",
		);
	});

	it("mapeia 'Testes.Para Testar' para TESTING", () => {
		expect(matchExternalStatus("Testes.Para Testar")).toBe("TESTING");
	});

	it("mapeia 'Homologação.Pronto para Publicação' para AWAITING_PUBLICATION", () => {
		expect(matchExternalStatus("Homologação.Pronto para Publicação")).toBe(
			"AWAITING_PUBLICATION",
		);
	});

	it("mapeia 'Concluído' para DONE", () => {
		expect(matchExternalStatus("Concluído")).toBe("DONE");
	});

	it("retorna null para coluna desconhecida", () => {
		expect(matchExternalStatus("Refinamento.Refinamento Técnico")).toBeNull();
	});
});
