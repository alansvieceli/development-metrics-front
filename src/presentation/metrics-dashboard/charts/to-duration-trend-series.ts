import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type DurationTrendPoint = {
	label: string;
	leadTimeMs: number | null;
	cycleTimeMs: number | null;
};

export function toDurationTrendSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): DurationTrendPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		leadTimeMs: entry.leadTime?.medianMs ?? null,
		cycleTimeMs: entry.cycleTime?.medianMs ?? null,
	}));
}
