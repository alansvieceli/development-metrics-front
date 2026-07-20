import { describe, expect, it } from "vitest";
import {
	formatPeriodLabel,
	formatPeriodShortLabel,
} from "./format-period-label";

describe("formatPeriodLabel", () => {
	it("formata semana com o rótulo e o intervalo de datas", () => {
		expect(
			formatPeriodLabel(
				"WEEK",
				new Date("2026-07-13T00:00:00Z"),
				new Date("2026-07-20T00:00:00Z"),
			),
		).toBe("Semana · 13/07 – 19/07");
	});

	it("formata mês com o rótulo e o intervalo de datas", () => {
		expect(
			formatPeriodLabel(
				"MONTH",
				new Date("2026-06-16T00:00:00Z"),
				new Date("2026-07-16T00:00:00Z"),
			),
		).toBe("Mês · 16/06 – 15/07");
	});

	it("formata 15 dias com o rótulo e o intervalo de datas", () => {
		expect(
			formatPeriodLabel(
				"FORTNIGHT",
				new Date("2026-07-01T00:00:00Z"),
				new Date("2026-07-16T00:00:00Z"),
			),
		).toBe("15 dias · 01/07 – 15/07");
	});
});

describe("formatPeriodShortLabel", () => {
	it("formata como dia/mês do início do período, independente do tipo", () => {
		expect(
			formatPeriodShortLabel("WEEK", new Date("2026-07-13T00:00:00Z")),
		).toBe("13/07");
		expect(
			formatPeriodShortLabel("MONTH", new Date("2026-06-16T00:00:00Z")),
		).toBe("16/06");
		expect(
			formatPeriodShortLabel("FORTNIGHT", new Date("2026-07-16T00:00:00Z")),
		).toBe("16/07");
	});
});
