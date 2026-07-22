import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import { getDeveloperMetrics } from "@/application/metrics/use-cases/get-developer-metrics";
import {
	getMetricsDashboard,
	getMetricsDashboardForRange,
} from "@/application/metrics/use-cases/get-metrics-dashboard";
import {
	getMetricsPeriodPreference,
	setMetricsPeriodPreference,
} from "@/application/metrics/use-cases/metrics-period-preference";
import { cookieMetricsPeriodPreferenceStore } from "@/infrastructure/metrics/cookie-metrics-period-preference-store";
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
		getMetricsPeriodPreference: (teamId: string) =>
			getMetricsPeriodPreference(cookieMetricsPeriodPreferenceStore, teamId),
		setMetricsPeriodPreference: (
			teamId: string,
			preference: MetricsPeriodPreference,
		) =>
			setMetricsPeriodPreference(
				cookieMetricsPeriodPreferenceStore,
				teamId,
				preference,
			),
	};
}
