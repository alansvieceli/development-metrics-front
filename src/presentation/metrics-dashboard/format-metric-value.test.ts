import { describe, expect, it } from "vitest";
import { formatDuration, formatPercent } from "./format-metric-value";

describe("formatDuration", () => {
	it("formata minutos quando menor que uma hora", () => {
		expect(formatDuration(30 * 60 * 1000)).toBe("30min");
	});

	it("formata horas quando menor que um dia", () => {
		expect(formatDuration(5 * 60 * 60 * 1000)).toBe("5h");
	});

	it("formata dias e horas quando maior ou igual a um dia", () => {
		expect(formatDuration(2 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000)).toBe(
			"2d 3h",
		);
	});

	it("omite horas quando são exatamente zero", () => {
		expect(formatDuration(3 * 24 * 60 * 60 * 1000)).toBe("3d");
	});
});

describe("formatPercent", () => {
	it("arredonda e adiciona o símbolo de porcentagem", () => {
		expect(formatPercent(33.333)).toBe("33%");
	});
});
