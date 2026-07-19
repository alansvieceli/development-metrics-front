import type { PeriodType } from "@/application/metrics/period";
import { getPreviousPeriods } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import {
	getMetricsForRange,
	type HistoricalPeriodMetrics,
	type PeriodMetrics,
} from "./get-metrics-for-period";

const HISTORY_LENGTH = 8;

export type MetricsDashboardResult = {
	current: PeriodMetrics;
	history: HistoricalPeriodMetrics[];
};

export async function getMetricsDashboard(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
): Promise<MetricsDashboardResult> {
	const periods = getPreviousPeriods(periodType, referenceDate, HISTORY_LENGTH);
	const windowStart = periods[0].start;
	const windowEnd = periods[periods.length - 1].end;
	const snapshot = await port.loadSnapshot(teamId, windowStart, windowEnd);
	const now = new Date();

	const history = periods.map((range) =>
		getMetricsForRange(snapshot, range.start, range.end, now),
	);
	const current = history[history.length - 1];

	return {
		current: { ...current, wip: snapshot.wip },
		history,
	};
}
