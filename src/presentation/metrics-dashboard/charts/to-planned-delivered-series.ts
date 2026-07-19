import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type PlannedDeliveredPoint = {
	label: string;
	planned: number;
	delivered: number;
};

export function toPlannedDeliveredSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): PlannedDeliveredPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		planned: entry.predictabilityCounts?.planned ?? 0,
		delivered: entry.predictabilityCounts?.delivered ?? 0,
	}));
}
