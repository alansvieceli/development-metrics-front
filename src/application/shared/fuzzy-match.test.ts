import { describe, expect, it } from "vitest";
import { matchesEitherWay, normalizeForMatch } from "./fuzzy-match";

describe("normalizeForMatch", () => {
	it("remove acentos e normaliza para minúsculas", () => {
		expect(normalizeForMatch("Homologação")).toBe("homologacao");
	});
});

describe("matchesEitherWay", () => {
	it("casa quando a primeira string contém a segunda", () => {
		expect(matchesEitherWay("Pronto para Publicação", "Publicação")).toBe(true);
	});

	it("casa quando a segunda string contém a primeira", () => {
		expect(matchesEitherWay("Testes", "Testes.Para Testar")).toBe(true);
	});

	it("ignora acentuação e caixa na comparação", () => {
		expect(matchesEitherWay("CONCLUIDO", "Concluído")).toBe(true);
	});

	it("não casa strings sem relação", () => {
		expect(matchesEitherWay("Backlog", "Homologação")).toBe(false);
	});

	it("não casa quando uma das strings é vazia", () => {
		expect(matchesEitherWay("", "Backlog")).toBe(false);
	});
});
