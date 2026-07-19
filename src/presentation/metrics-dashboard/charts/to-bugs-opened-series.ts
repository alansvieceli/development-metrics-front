import type { PeriodType } from "@/application/metrics/period";
import type { HistoricalPeriodMetrics } from "@/application/metrics/use-cases/get-metrics-for-period";
import { formatPeriodShortLabel } from "../format-period-label";

export type BugsOpenedPoint = { label: string; bugsOpened: number };

export function toBugsOpenedSeries(
	history: HistoricalPeriodMetrics[],
	periodType: PeriodType,
): BugsOpenedPoint[] {
	return history.map((entry) => ({
		label: formatPeriodShortLabel(periodType, entry.periodStart),
		bugsOpened: entry.bugsOpened,
	}));
}
