import { describe, expect, it } from "vitest";
import { parseMetricsFilter } from "./parse-metrics-search-params";

describe("parseMetricsFilter", () => {
	it("usa semana e a data atual quando não há parâmetros", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(parseMetricsFilter({}, now)).toEqual({
			periodType: "WEEK",
			referenceDate: now,
		});
	});

	it("interpreta period=month", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(parseMetricsFilter({ period: "month" }, now).periodType).toBe(
			"MONTH",
		);
	});

	it("interpreta period=fortnight", () => {
		expect(parseMetricsFilter({ period: "fortnight" }).periodType).toBe(
			"FORTNIGHT",
		);
	});

	it("interpreta a data informada na URL", () => {
		const result = parseMetricsFilter({ date: "2026-06-01" });
		expect(result.referenceDate).toEqual(new Date("2026-06-01T00:00:00Z"));
	});

	it("ignora data em formato inválido e usa a data atual", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(
			parseMetricsFilter({ date: "not-a-date" }, now).referenceDate,
		).toEqual(now);
	});

	it("ignora data inexistente e usa a data atual", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(
			parseMetricsFilter({ date: "2026-02-31" }, now).referenceDate,
		).toEqual(now);
	});

	it("ignora period desconhecido e usa semana", () => {
		expect(parseMetricsFilter({ period: "year" }).periodType).toBe("WEEK");
	});

	it("interpreta period=sprint com start e end válidos", () => {
		const result = parseMetricsFilter({
			period: "sprint",
			start: "2026-07-06",
			end: "2026-07-17",
		});
		expect(result).toEqual({
			periodType: "SPRINT",
			referenceDate: new Date("2026-07-06T00:00:00Z"),
			start: new Date("2026-07-06T00:00:00Z"),
			end: new Date("2026-07-18T00:00:00Z"),
		});
	});

	it("aceita sprint de um único dia (start igual a end)", () => {
		const result = parseMetricsFilter({
			period: "sprint",
			start: "2026-07-06",
			end: "2026-07-06",
		});
		expect(result.periodType).toBe("SPRINT");
	});

	it("ignora sprint com start depois do end e usa semana", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter(
			{ period: "sprint", start: "2026-07-17", end: "2026-07-06" },
			now,
		);
		expect(result).toEqual({ periodType: "WEEK", referenceDate: now });
	});

	it("ignora sprint sem end e usa semana", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter(
			{ period: "sprint", start: "2026-07-06" },
			now,
		);
		expect(result).toEqual({ periodType: "WEEK", referenceDate: now });
	});
});
