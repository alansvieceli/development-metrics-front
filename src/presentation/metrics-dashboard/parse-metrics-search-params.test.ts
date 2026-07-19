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
});
