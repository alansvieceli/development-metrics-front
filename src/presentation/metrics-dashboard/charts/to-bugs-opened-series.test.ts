import { describe, expect, it } from "vitest";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { toBugsOpenedSeries } from "./to-bugs-opened-series";

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

describe("toBugsOpenedSeries", () => {
	it("mapeia cada período pro rótulo curto e o total de bugs abertos", () => {
		const history = [
			historicalEntry({
				periodStart: new Date("2026-07-06T00:00:00Z"),
				bugsOpened: 3,
			}),
			historicalEntry({
				periodStart: new Date("2026-07-13T00:00:00Z"),
				bugsOpened: 1,
			}),
		];

		expect(toBugsOpenedSeries(history, "WEEK")).toEqual([
			{ label: "06/07", bugsOpened: 3 },
			{ label: "13/07", bugsOpened: 1 },
		]);
	});
});
