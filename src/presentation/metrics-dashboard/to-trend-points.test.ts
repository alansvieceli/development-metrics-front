import { describe, expect, it } from "vitest";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-dashboard";
import type { PeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toTrendPoints } from "./to-trend-points";

function entry(
	overrides: Partial<PeriodMetrics> = {},
	periodStart = new Date("2026-07-01T00:00:00Z"),
): MetricsSeriesEntry {
	const periodEnd = new Date(periodStart.getTime() + 86_400_000);
	return {
		periodStart,
		periodEnd,
		metrics: {
			periodStart,
			periodEnd,
			leadTime: null,
			cycleTime: null,
			blockedTime: null,
			codeReviewTime: null,
			reworkRate: null,
			throughput: 0,
			predictability: null,
			...overrides,
		},
	};
}

describe("toTrendPoints", () => {
	it("mapeia average/median para duration-dual", () => {
		const entries = [entry({ leadTime: { averageMs: 1000, medianMs: 900 } })];
		expect(toTrendPoints(entries, "leadTime", "duration-dual")).toEqual([
			{ periodStart: entries[0].periodStart, primary: 1000, secondary: 900 },
		]);
	});

	it("mapeia valor único para percent-single", () => {
		const entries = [entry({ reworkRate: 25 })];
		expect(toTrendPoints(entries, "reworkRate", "percent-single")).toEqual([
			{ periodStart: entries[0].periodStart, primary: 25, secondary: null },
		]);
	});

	it("mapeia contagem para count-bar sem remover períodos vazios", () => {
		const entries = [entry({ throughput: 0 }), entry({ throughput: 3 })];
		expect(toTrendPoints(entries, "throughput", "count-bar")).toHaveLength(2);
	});

	it("remove períodos iniciais sem dado para métricas de linha", () => {
		const entries = [
			entry({ leadTime: null }, new Date("2026-06-01T00:00:00Z")),
			entry({ leadTime: null }, new Date("2026-06-08T00:00:00Z")),
			entry(
				{ leadTime: { averageMs: 500, medianMs: 500 } },
				new Date("2026-06-15T00:00:00Z"),
			),
		];
		const result = toTrendPoints(entries, "leadTime", "duration-dual");
		expect(result).toHaveLength(1);
		expect(result[0].periodStart).toEqual(new Date("2026-06-15T00:00:00Z"));
	});

	it("retorna lista vazia quando nenhum período tem dado", () => {
		const entries = [entry({ leadTime: null })];
		expect(toTrendPoints(entries, "leadTime", "duration-dual")).toEqual([]);
	});
});
