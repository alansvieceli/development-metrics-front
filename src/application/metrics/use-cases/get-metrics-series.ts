import { getPreviousPeriods, type PeriodType } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import { getMetricsForRange, type PeriodMetrics } from "./get-metrics-for-period";

export type MetricsSeriesEntry = {
	periodStart: Date;
	periodEnd: Date;
	metrics: PeriodMetrics;
};

export async function getMetricsSeries(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
	howManyPeriods: number,
): Promise<MetricsSeriesEntry[]> {
	const ranges = getPreviousPeriods(periodType, referenceDate, howManyPeriods);
	return Promise.all(
		ranges.map(async (range) => ({
			periodStart: range.start,
			periodEnd: range.end,
			metrics: await getMetricsForRange(port, teamId, range.start, range.end),
		})),
	);
}
