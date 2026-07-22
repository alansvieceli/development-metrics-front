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

	it("interpreta period=custom com start e end válidos", () => {
		const result = parseMetricsFilter({
			period: "custom",
			start: "2026-07-06",
			end: "2026-07-17",
		});
		expect(result).toEqual({
			periodType: "CUSTOM",
			referenceDate: new Date("2026-07-06T00:00:00Z"),
			start: new Date("2026-07-06T00:00:00Z"),
			end: new Date("2026-07-18T00:00:00Z"),
		});
	});

	it("aceita período customizado de um único dia (start igual a end)", () => {
		const result = parseMetricsFilter({
			period: "custom",
			start: "2026-07-06",
			end: "2026-07-06",
		});
		expect(result.periodType).toBe("CUSTOM");
	});

	it("ignora período customizado com start depois do end e usa semana", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter(
			{ period: "custom", start: "2026-07-17", end: "2026-07-06" },
			now,
		);
		expect(result).toEqual({ periodType: "WEEK", referenceDate: now });
	});

	it("ignora período customizado sem end e usa semana", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter(
			{ period: "custom", start: "2026-07-06" },
			now,
		);
		expect(result).toEqual({ periodType: "WEEK", referenceDate: now });
	});

	it("usa a preferência salva quando a URL não especifica period", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter({}, now, { period: "month" });
		expect(result).toEqual({ periodType: "MONTH", referenceDate: now });
	});

	it("usa start/end da preferência salva quando period é custom", () => {
		const result = parseMetricsFilter({}, new Date("2026-07-15T12:00:00Z"), {
			period: "custom",
			start: "2026-07-06",
			end: "2026-07-17",
		});
		expect(result).toEqual({
			periodType: "CUSTOM",
			referenceDate: new Date("2026-07-06T00:00:00Z"),
			start: new Date("2026-07-06T00:00:00Z"),
			end: new Date("2026-07-18T00:00:00Z"),
		});
	});

	it("ignora a preferência salva quando a URL já especifica period", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		const result = parseMetricsFilter({ period: "week" }, now, {
			period: "month",
		});
		expect(result).toEqual({ periodType: "WEEK", referenceDate: now });
	});

	it("ignora preferência ausente e usa semana", () => {
		const now = new Date("2026-07-15T12:00:00Z");
		expect(parseMetricsFilter({}, now, null)).toEqual({
			periodType: "WEEK",
			referenceDate: now,
		});
	});
});
