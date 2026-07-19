import { describe, expect, it } from "vitest";
import { formatPeriodLabel, formatPeriodShortLabel } from "./format-period-label";

describe("formatPeriodLabel", () => {
	it("formata uma semana comum com o número ISO e o intervalo de datas", () => {
		expect(
			formatPeriodLabel(
				"WEEK",
				new Date("2026-07-13T00:00:00Z"),
				new Date("2026-07-20T00:00:00Z"),
			),
		).toBe("Semana 29 · 13/07 – 19/07");
	});

	it("atribui a semana que começa em dezembro à semana 1 do ano seguinte", () => {
		expect(
			formatPeriodLabel(
				"WEEK",
				new Date("2025-12-29T00:00:00Z"),
				new Date("2026-01-05T00:00:00Z"),
			),
		).toBe("Semana 1 · 29/12 – 04/01");
	});

	it("formata o mês por extenso e capitalizado", () => {
		expect(
			formatPeriodLabel(
				"MONTH",
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-08-01T00:00:00Z"),
			),
		).toBe("Julho de 2026");
	});
});

describe("formatPeriodShortLabel", () => {
	it("formata semana como dia/mês do início do período", () => {
		expect(
			formatPeriodShortLabel("WEEK", new Date("2026-07-13T00:00:00Z")),
		).toBe("13/07");
	});

	it("formata mês como abreviação capitalizada + ano curto", () => {
		expect(
			formatPeriodShortLabel("MONTH", new Date("2026-07-01T00:00:00Z")),
		).toBe("Jul/26");
	});
});
