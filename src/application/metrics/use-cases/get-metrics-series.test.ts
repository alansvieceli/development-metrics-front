import { describe, expect, it } from "vitest";
import { getPreviousPeriods } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsSeries } from "./get-metrics-series";

describe("getMetricsSeries", () => {
	it("retorna a métrica correta alinhada a cada período da série", async () => {
		const referenceDate = new Date("2026-07-15T12:00:00Z");
		const expectedRanges = getPreviousPeriods("WEEK", referenceDate, 3);
		const targetRange = expectedRanges[2];

		const port: MetricsQueryPort = {
			async listCompletedTasksInPeriod(_teamId, periodStart) {
				if (periodStart.getTime() === targetRange.start.getTime()) {
					return [
						{
							taskId: "task-1",
							createdAt: targetRange.start,
							completedAt: targetRange.start,
							statusChanges: [],
							blockedPeriods: [],
						},
					];
				}
				return [];
			},
			async listTasksWithDueDateInPeriod() {
				return [];
			},
			async countWip() {
				return 0;
			},
		};

		const series = await getMetricsSeries(port, "team-1", "WEEK", referenceDate, 3);

		expect(series).toHaveLength(3);
		expect(series.map((entry) => entry.periodStart)).toEqual(
			expectedRanges.map((range) => range.start),
		);
		expect(series.map((entry) => entry.metrics.throughput)).toEqual([0, 0, 1]);
	});
});
