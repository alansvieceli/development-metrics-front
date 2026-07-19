import type { PeriodType } from "@/application/metrics/period";
import { getDeveloperMetrics } from "@/application/metrics/use-cases/get-developer-metrics";
import {
	getMetricsDashboard,
	getMetricsDashboardForRange,
} from "@/application/metrics/use-cases/get-metrics-dashboard";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";

export function createMetricsUseCases() {
	return {
		getDeveloperMetrics: (
			teamId: string,
			assigneeId: string,
			previousStart: Date,
			start: Date,
			end: Date,
		) =>
			getDeveloperMetrics(
				drizzleMetricsQueryPort,
				teamId,
				assigneeId,
				previousStart,
				start,
				end,
			),
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
