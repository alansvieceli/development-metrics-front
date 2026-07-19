import type { DurationStats } from "@/application/metrics/formulas/duration-metrics";
import {
	calculateBlockedTime,
	calculateCycleTime,
	calculateLeadTime,
	calculateTimeInStatus,
} from "@/application/metrics/formulas/duration-metrics";
import {
	calculatePredictability,
	calculatePredictabilityCounts,
	calculateReworkCount,
	calculateReworkRate,
	calculateUnplannedCount,
	type PredictabilityCounts,
} from "@/application/metrics/formulas/rate-metrics";
import type {
	CompletedTaskMetrics,
	MetricsSnapshot,
	WipBreakdown,
} from "@/application/metrics/ports/metrics-query-port";

export type PeriodMetrics = {
	periodStart: Date;
	periodEnd: Date;
	leadTime: DurationStats | null;
	cycleTime: DurationStats | null;
	blockedTime: DurationStats | null;
	codeReviewTime: DurationStats | null;
	testingTime: DurationStats | null;
	awaitingPublicationTime: DurationStats | null;
	reworkRate: number | null;
	reworkCount: number | null;
	throughput: number;
	wip: WipBreakdown;
	predictability: number | null;
	predictabilityCounts: PredictabilityCounts | null;
	unplannedCount: number | null;
};

export type HistoricalPeriodMetrics = Omit<PeriodMetrics, "wip">;

export function getMetricsForRange(
	snapshot: MetricsSnapshot,
	periodStart: Date,
	periodEnd: Date,
	now: Date = new Date(),
): HistoricalPeriodMetrics {
	const completionByTask = new Map<
		string,
		MetricsSnapshot["completionEvents"][number]
	>();
	for (const completion of snapshot.completionEvents) {
		if (
			completion.completedAt >= periodStart &&
			completion.completedAt < periodEnd
		) {
			const previous = completionByTask.get(completion.taskId);
			if (!previous || completion.completedAt > previous.completedAt) {
				completionByTask.set(completion.taskId, completion);
			}
		}
	}
	const completedTasks = [...completionByTask.values()].map(
		(completion): CompletedTaskMetrics => ({
			...completion,
			statusChanges: snapshot.statusChanges
				.filter((change) => change.taskId === completion.taskId)
				.map(({ taskId: _taskId, ...change }) => change),
			blockedPeriods: snapshot.blockedPeriods
				.filter((period) => period.taskId === completion.taskId)
				.map(({ taskId: _taskId, ...period }) => period),
		}),
	);
	const startDate = periodStart.toISOString().slice(0, 10);
	const endDate = periodEnd.toISOString().slice(0, 10);
	const dueDateTasks = snapshot.dueDateTasks.filter(
		(task) => task.dueDate >= startDate && task.dueDate < endDate,
	);
	return {
		periodStart,
		periodEnd,
		leadTime: calculateLeadTime(completedTasks),
		cycleTime: calculateCycleTime(completedTasks),
		blockedTime: calculateBlockedTime(completedTasks, now),
		codeReviewTime: calculateTimeInStatus(completedTasks, "CODE_REVIEW"),
		testingTime: calculateTimeInStatus(completedTasks, "TESTING"),
		awaitingPublicationTime: calculateTimeInStatus(
			completedTasks,
			"AWAITING_PUBLICATION",
		),
		reworkRate: calculateReworkRate(completedTasks),
		reworkCount: calculateReworkCount(completedTasks),
		throughput: completedTasks.length,
		predictability: calculatePredictability(dueDateTasks),
		predictabilityCounts: calculatePredictabilityCounts(dueDateTasks),
		unplannedCount: calculateUnplannedCount(
			completedTasks,
			periodStart,
			periodEnd,
		),
	};
}
