import {
	getPeriodRange,
	getPreviousPeriods,
	type PeriodRange,
	type PeriodType,
} from "@/application/metrics/period";
import type {
	MetricsQueryPort,
	MetricsSnapshot,
} from "@/application/metrics/ports/metrics-query-port";
import {
	getMetricsForRange,
	type HistoricalPeriodMetrics,
	type PeriodMetrics,
} from "./get-metrics-for-period";

const WEEKLY_SERIES_LENGTH = 8;
const MONTHLY_SERIES_LENGTH = 6;

export type MetricsSeriesEntry = {
	periodStart: Date;
	periodEnd: Date;
	metrics: HistoricalPeriodMetrics;
};

export type MetricsDashboardResult = {
	current: PeriodMetrics;
	weeklySeries: MetricsSeriesEntry[];
	monthlySeries: MetricsSeriesEntry[];
};

export async function getMetricsDashboard(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
): Promise<MetricsDashboardResult> {
	const currentRange = getPeriodRange(periodType, referenceDate);
	const weeklyRanges = getPreviousPeriods(
		"WEEK",
		referenceDate,
		WEEKLY_SERIES_LENGTH,
	);
	const monthlyRanges = getPreviousPeriods(
		"MONTH",
		referenceDate,
		MONTHLY_SERIES_LENGTH,
	);
	const allRanges = [currentRange, ...weeklyRanges, ...monthlyRanges];
	const snapshotStart = new Date(
		Math.min(...allRanges.map((range) => range.start.getTime())),
	);
	const snapshotEnd = new Date(
		Math.max(...allRanges.map((range) => range.end.getTime())),
	);
	const snapshot = await port.loadSnapshot(teamId, snapshotStart, snapshotEnd);
	const now = new Date();

	return {
		current: {
			...getMetricsForRange(
				snapshot,
				currentRange.start,
				currentRange.end,
				now,
			),
			wip: snapshot.wip,
		},
		weeklySeries: toSeries(snapshot, weeklyRanges, now),
		monthlySeries: toSeries(snapshot, monthlyRanges, now),
	};
}

function toSeries(
	snapshot: MetricsSnapshot,
	ranges: PeriodRange[],
	now: Date,
): MetricsSeriesEntry[] {
	return ranges.map((range) => ({
		periodStart: range.start,
		periodEnd: range.end,
		metrics: getMetricsForRange(snapshot, range.start, range.end, now),
	}));
}
