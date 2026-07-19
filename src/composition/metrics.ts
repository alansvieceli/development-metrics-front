import type { PeriodType } from "@/application/metrics/period";
import {
	getMetricsDashboard,
	getMetricsDashboardForRange,
} from "@/application/metrics/use-cases/get-metrics-dashboard";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";

export function createMetricsUseCases() {
	return {
		getMetricsDashboard: (
			teamId: string,
			periodType: PeriodType,
			referenceDate: Date,
			wipLimit: number,
		) =>
			getMetricsDashboard(
				drizzleMetricsQueryPort,
				teamId,
				periodType,
				referenceDate,
				wipLimit,
			),
		getMetricsDashboardForRange: (
			teamId: string,
			start: Date,
			end: Date,
			wipLimit: number,
		) =>
			getMetricsDashboardForRange(
				drizzleMetricsQueryPort,
				teamId,
				start,
				end,
				wipLimit,
			),
	};
}
