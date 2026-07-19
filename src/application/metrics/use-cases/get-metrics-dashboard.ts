import type { PeriodType } from "@/application/metrics/period";
import { getPeriodRange } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";
import {
	getMetricsForRange,
	type PeriodMetrics,
} from "./get-metrics-for-period";

export type MetricsDashboardResult = {
	current: PeriodMetrics;
};

export async function getMetricsDashboard(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
): Promise<MetricsDashboardResult> {
	const currentRange = getPeriodRange(periodType, referenceDate);
	const snapshot = await port.loadSnapshot(
		teamId,
		currentRange.start,
		currentRange.end,
	);
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
	};
}
