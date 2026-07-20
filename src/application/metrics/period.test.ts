import { describe, expect, it } from "vitest";
import { getPeriodRange, getPreviousPeriods } from "./period";

describe("getPeriodRange", () => {
	it("calcula os últimos 7 dias terminando na data de referência", () => {
		const range = getPeriodRange("WEEK", new Date("2026-07-15T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-09T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-07-16T00:00:00Z"));
	});

	it("calcula os últimos 15 dias terminando na data de referência", () => {
		const range = getPeriodRange("FORTNIGHT", new Date("2026-07-15T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-07-01T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-07-16T00:00:00Z"));
	});

	it("calcula os últimos 30 dias terminando na data de referência", () => {
		const range = getPeriodRange("MONTH", new Date("2026-07-15T12:00:00Z"));
		expect(range.start).toEqual(new Date("2026-06-16T00:00:00Z"));
		expect(range.end).toEqual(new Date("2026-07-16T00:00:00Z"));
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
		expect(ranges[0].start).toEqual(new Date("2026-06-25T00:00:00Z"));
		expect(ranges[1].start).toEqual(new Date("2026-07-02T00:00:00Z"));
		expect(ranges[2].start).toEqual(new Date("2026-07-09T00:00:00Z"));
		expect(ranges[2].end).toEqual(new Date("2026-07-16T00:00:00Z"));
	});

	it("retorna janelas de 15 dias consecutivas", () => {
		const ranges = getPreviousPeriods(
			"FORTNIGHT",
			new Date("2026-07-20T12:00:00Z"),
			3,
		);
		expect(ranges.map(({ start }) => start)).toEqual([
			new Date("2026-06-06T00:00:00Z"),
			new Date("2026-06-21T00:00:00Z"),
			new Date("2026-07-06T00:00:00Z"),
		]);
	});
});
