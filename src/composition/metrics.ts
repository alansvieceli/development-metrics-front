import type { PeriodType } from "@/application/metrics/period";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import { getDeveloperMetrics } from "@/application/metrics/use-cases/get-developer-metrics";
import {
	getMetricsDashboard,
	getMetricsDashboardForRange,
} from "@/application/metrics/use-cases/get-metrics-dashboard";
import { getMetricsForSprint } from "@/application/metrics/use-cases/get-metrics-for-sprint";
import {
	getMetricsPeriodPreference,
	setMetricsPeriodPreference,
} from "@/application/metrics/use-cases/metrics-period-preference";
import { cookieMetricsPeriodPreferenceStore } from "@/infrastructure/metrics/cookie-metrics-period-preference-store";
import { drizzleMetricsQueryPort } from "@/infrastructure/metrics/drizzle-metrics-query-port";
import { drizzleSprintMetricsSnapshotRepository } from "@/infrastructure/sprint/drizzle-sprint-metrics-snapshot-repository";
import { drizzleSprintRepository } from "@/infrastructure/sprint/drizzle-sprint-repository";

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
			tagIds: string[],
		) =>
			getMetricsDashboard(
				drizzleMetricsQueryPort,
				teamId,
				periodType,
				referenceDate,
				wipLimit,
				tagIds,
			),
		getMetricsDashboardForRange: (
			teamId: string,
			start: Date,
			end: Date,
			wipLimit: number,
			tagIds: string[],
		) =>
			getMetricsDashboardForRange(
				drizzleMetricsQueryPort,
				teamId,
				start,
				end,
				wipLimit,
				tagIds,
			),
		getMetricsForSprint: (sprintId: string, teamId: string, wipLimit: number) =>
			getMetricsForSprint(
				drizzleSprintRepository,
				drizzleSprintMetricsSnapshotRepository,
				drizzleMetricsQueryPort,
				sprintId,
				teamId,
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
