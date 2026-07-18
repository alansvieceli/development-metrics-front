import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import type { MetricsSeriesEntry } from "@/application/metrics/use-cases/get-metrics-series";
import type { MetricKey, MetricShape } from "./metric-definitions";

export type TrendPoint = {
	periodStart: Date;
	primary: number | null;
	secondary: number | null;
};

export function toTrendPoints(
	entries: MetricsSeriesEntry[],
	key: MetricKey,
	shape: MetricShape,
): TrendPoint[] {
	const points = entries.map((entry): TrendPoint => {
		const value = entry.metrics[key];
		if (shape === "duration-dual") {
			const stats = value as DurationStats | null;
			return {
				periodStart: entry.periodStart,
				primary: stats?.averageMs ?? null,
				secondary: stats?.medianMs ?? null,
			};
		}
		if (shape === "percent-single") {
			return {
				periodStart: entry.periodStart,
				primary: value as number | null,
				secondary: null,
			};
		}
		return {
			periodStart: entry.periodStart,
			primary: value as number,
			secondary: null,
		};
	});

	if (shape === "count-bar" || shape === "number-only") {
		return points;
	}
	const firstWithData = points.findIndex((point) => point.primary !== null);
	return firstWithData === -1 ? [] : points.slice(firstWithData);
}
