import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type ThroughputPoint = { label: string; throughput: number };

export function toThroughputSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): ThroughputPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		throughput: entry.throughput,
	}));
}
