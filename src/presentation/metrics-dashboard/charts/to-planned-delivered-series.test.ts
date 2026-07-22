import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toPlannedDeliveredSeries } from "./to-planned-delivered-series";

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

describe("toPlannedDeliveredSeries", () => {
	it("mapeia planejado e entregue de cada período", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				predictabilityCounts: { planned: 8, delivered: 7 },
			}),
		];

		expect(toPlannedDeliveredSeries(history, "WEEK")).toEqual([
			{ label: "13/07", planned: 8, delivered: 7 },
		]);
	});

	it("usa 0/0 quando não há tasks com prazo no período", () => {
		const history = [
			historicalEntry({ periodStart: new Date("2026-07-13T00:00:00Z") }),
		];

		expect(toPlannedDeliveredSeries(history, "WEEK")).toEqual([
			{ label: "13/07", planned: 0, delivered: 0 },
		]);
	});
});
