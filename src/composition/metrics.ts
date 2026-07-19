import type { PeriodType } from "@/application/metrics/period";
import { getMetricsDashboard } from "@/application/metrics/use-cases/get-metrics-dashboard";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";

export function createMetricsUseCases() {
	return {
		getMetricsDashboard: (
			teamId: string,
			periodType: PeriodType,
			referenceDate: Date,
		) =>
			getMetricsDashboard(
				drizzleMetricsQueryPort,
				teamId,
				periodType,
				referenceDate,
			),
	};
}
