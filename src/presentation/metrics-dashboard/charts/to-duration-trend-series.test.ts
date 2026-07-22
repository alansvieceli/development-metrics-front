import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toDurationTrendSeries } from "./to-duration-trend-series";

function historicalEntry(
	overrides: Partial<HistoricalPeriodMetrics>,
): HistoricalPeriodMetrics {
	return {
		periodStart: new Date("2026-07-13T00:00:00Z"),
		periodEnd: new Date("2026-07-20T00:00:00Z"),
		leadTime: null,
		cycleTime: null,
		cycleTimeOutliers: [],
		blockedTime: null,
		codeReviewTime: null,
		testingTime: null,
		awaitingPublicationTime: null,
		reworkRate: null,
		reworkCount: null,
		throughput: 0,
		predictability: null,
		predictabilityCounts: null,
		unplannedCount: null,
		bugsOpened: 0,
		bugsRanking: [],
		...overrides,
	};
}

describe("toDurationTrendSeries", () => {
	it("usa a mediana de lead time e cycle time", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				leadTime: { averageMs: 1000, medianMs: 900 },
				cycleTime: { averageMs: 500, medianMs: 400 },
			}),
		];

		expect(toDurationTrendSeries(history, "WEEK")).toEqual([
			{ label: "13/07", leadTimeMs: 900, cycleTimeMs: 400 },
		]);
	});

	it("usa null quando não há dado no período", () => {
		const history = [
			historicalEntry({ periodStart: new Date("2026-07-13T00:00:00Z") }),
		];

		expect(toDurationTrendSeries(history, "WEEK")).toEqual([
			{ label: "13/07", leadTimeMs: null, cycleTimeMs: null },
		]);
	});
});
