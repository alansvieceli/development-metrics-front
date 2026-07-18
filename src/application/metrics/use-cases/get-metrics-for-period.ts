import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import {
	calculateBlockedTime,
	calculateCodeReviewTime,
	calculateCycleTime,
	calculateLeadTime,
} from "@/application/metrics/formulas/duration-metrics";
import {
	calculatePredictability,
	calculateReworkRate,
} from "@/application/metrics/formulas/rate-metrics";
import { getPeriodRange, type PeriodType } from "@/application/metrics/period";
import type { MetricsQueryPort } from "@/application/metrics/ports/metrics-query-port";

export type PeriodMetrics = {
	periodStart: Date;
	periodEnd: Date;
	leadTime: DurationStats | null;
	cycleTime: DurationStats | null;
	blockedTime: DurationStats | null;
	codeReviewTime: DurationStats | null;
	reworkRate: number | null;
	throughput: number;
	wip: number;
	predictability: number | null;
};

export async function getMetricsForRange(
	port: MetricsQueryPort,
	teamId: string,
	periodStart: Date,
	periodEnd: Date,
	now: Date = new Date(),
): Promise<PeriodMetrics> {
	const [completedTasks, dueDateTasks, wip] = await Promise.all([
		port.listCompletedTasksInPeriod(teamId, periodStart, periodEnd),
		port.listTasksWithDueDateInPeriod(teamId, periodStart, periodEnd),
		port.countWip(teamId),
	]);

	return {
		periodStart,
		periodEnd,
		leadTime: calculateLeadTime(completedTasks),
		cycleTime: calculateCycleTime(completedTasks),
		blockedTime: calculateBlockedTime(completedTasks, now),
		codeReviewTime: calculateCodeReviewTime(completedTasks),
		reworkRate: calculateReworkRate(completedTasks),
		throughput: completedTasks.length,
		wip,
		predictability: calculatePredictability(dueDateTasks),
	};
}

export async function getMetricsForPeriod(
	port: MetricsQueryPort,
	teamId: string,
	periodType: PeriodType,
	referenceDate: Date,
): Promise<PeriodMetrics> {
	const { start, end } = getPeriodRange(periodType, referenceDate);
	return getMetricsForRange(port, teamId, start, end);
}
