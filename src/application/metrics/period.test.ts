import { describe, expect, it } from "vitest";
import { getPeriodRange, getPreviousPeriods } from "./period";

describe("getPeriodRange", () => {
	it("calcula a semana ISO (segunda a domingo) contendo a data de referência", () => {
		// 2026-07-15 é uma quarta-feira
		const range = getPeriodRange("WEEK", new Date("2026-07-15T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-07-20T00:00:00Z"));
	});

	it("calcula a semana quando a data de referência é domingo", () => {
		const range = getPeriodRange("WEEK", new Date("2026-07-19T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-07-20T00:00:00Z"));
	});

	it("calcula o mês de calendário contendo a data de referência", () => {
		const range = getPeriodRange("MONTH", new Date("2026-07-15T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-01T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-08-01T00:00:00Z"));
	});
});

describe("getPreviousPeriods", () => {
	it("retorna os últimos N períodos em ordem cronológica, terminando no período de referência", () => {
		const ranges = getPreviousPeriods(
			"WEEK",
			new Date("2026-07-15T12:00:00Z"),
			3,
		);
		expect(ranges).toHaveLength(3);
		expect(ranges[0].start).toEqual(new Date("2026-06-29T00:00:00Z"));
		expect(ranges[1].start).toEqual(new Date("2026-07-06T00:00:00Z"));
		expect(ranges[2].start).toEqual(new Date("2026-07-13T00:00:00Z"));
		expect(ranges[2].end).toEqual(new Date("2026-07-20T00:00:00Z"));
	});
});
