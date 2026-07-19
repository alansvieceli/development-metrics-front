import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toThroughputSeries } from "./to-throughput-series";

function historicalEntry(
	overrides: Partial<HistoricalPeriodMetrics>,
): HistoricalPeriodMetrics {
	return {
		periodStart: new Date("2026-07-13T00:00:00Z"),
		periodEnd: new Date("2026-07-20T00:00:00Z"),
		leadTime: null,
		cycleTime: null,
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

describe("toThroughputSeries", () => {
	it("mapeia cada período pro rótulo curto e o throughput", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-06T00:00:00Z"),
				throughput: 5,
			}),
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				throughput: 2,
			}),
		];

		expect(toThroughputSeries(history, "WEEK")).toEqual([
			{ label: "06/07", throughput: 5 },
			{ label: "13/07", throughput: 2 },
		]);
	});
});
