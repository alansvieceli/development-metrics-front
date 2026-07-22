import {
	type BugRankingEntry,
	calculateBugsOpened,
	calculateBugsRanking,
} from "@/application/metrics/formulas/bug-metrics";
import type { CurrentWipMetrics } from "@/application/metrics/formulas/current-wip-metrics";
import type {
	CycleTimeOutlier,
	DurationStats,
} from "@/application/metrics/formulas/duration-metrics";
import {
	calculateBlockedTime,
	calculateCycleTime,
	calculateCycleTimeOutliers,
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
} from "@/application/metrics/ports/metrics-query-port";

export type PeriodMetrics = {
	periodStart: Date;
	periodEnd: Date;
	leadTime: DurationStats | null;
	cycleTime: DurationStats | null;
	cycleTimeOutliers: CycleTimeOutlier[];
	blockedTime: DurationStats | null;
	codeReviewTime: DurationStats | null;
	testingTime: DurationStats | null;
	awaitingPublicationTime: DurationStats | null;
	reworkRate: number | null;
	reworkCount: number | null;
	throughput: number;
	wip: CurrentWipMetrics;
	predictability: number | null;
	predictabilityCounts: PredictabilityCounts | null;
	unplannedCount: number | null;
	bugsOpened: number;
	bugsRanking: BugRankingEntry[];
};

export type HistoricalPeriodMetrics = Omit<PeriodMetrics, "wip">;

export function getCompletedTasksForRange(
	snapshot: MetricsSnapshot,
	periodStart: Date,
	periodEnd: Date,
): CompletedTaskMetrics[] {
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
	return [...completionByTask.values()].map(
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
}

export function getMetricsForRange(
	snapshot: MetricsSnapshot,
	periodStart: Date,
	periodEnd: Date,
	now: Date = new Date(),
): HistoricalPeriodMetrics {
	const completedTasks = getCompletedTasksForRange(
		snapshot,
		periodStart,
		periodEnd,
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
		cycleTimeOutliers: calculateCycleTimeOutliers(completedTasks),
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
		bugsOpened: calculateBugsOpened(snapshot.bugEvents, periodStart, periodEnd),
		bugsRanking: calculateBugsRanking(
			snapshot.bugEvents,
			periodStart,
			periodEnd,
		),
	};
}
