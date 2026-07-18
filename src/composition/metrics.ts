import type { PeriodType } from "@/application/metrics/period";
import { getMetricsForPeriod } from "@/application/metrics/use-cases/get-metrics-for-period";
import { getMetricsSeries } from "@/application/metrics/use-cases/get-metrics-series";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";

export function createMetricsUseCases() {
	return {
		getMetricsForPeriod: (
			teamId: string,
			periodType: PeriodType,
			referenceDate: Date,
		) =>
			getMetricsForPeriod(
				drizzleMetricsQueryPort,
				teamId,
				periodType,
				referenceDate,
			),
		getMetricsSeries: (
			teamId: string,
			periodType: PeriodType,
			referenceDate: Date,
			howManyPeriods: number,
		) =>
			getMetricsSeries(
				drizzleMetricsQueryPort,
				teamId,
				periodType,
				referenceDate,
				howManyPeriods,
			),
	};
}
