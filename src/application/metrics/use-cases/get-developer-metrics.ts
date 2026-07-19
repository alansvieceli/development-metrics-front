import {
	hasRework,
	isUnplanned,
} from "@/application/metrics/formulas/rate-metrics";
import type {
	MetricsQueryPort,
	MetricsSnapshot,
	MetricTaskEvidence,
} from "@/application/metrics/ports/metrics-query-port";
import {
	getCompletedTasksForRange,
	getMetricsForRange,
	type HistoricalPeriodMetrics,
} from "./get-metrics-for-period";

export type DeveloperMetricEvidence = {
	delivered: MetricTaskEvidence[];
	predictability: MetricTaskEvidence[];
	cycleTime: MetricTaskEvidence[];
	unplanned: MetricTaskEvidence[];
	rework: MetricTaskEvidence[];
	blocked: MetricTaskEvidence[];
	codeReview: MetricTaskEvidence[];
	testing: MetricTaskEvidence[];
	bugsAssociated: MetricTaskEvidence[];
};

export type DeveloperMetricsResult = {
	current: HistoricalPeriodMetrics;
	previous: HistoricalPeriodMetrics;
	evidence: DeveloperMetricEvidence;
};

function identity(task: MetricTaskEvidence): MetricTaskEvidence {
	return {
		taskId: task.taskId,
		externalId: task.externalId,
		description: task.description,
	};
}

function unique(tasks: MetricTaskEvidence[]): MetricTaskEvidence[] {
	return [...new Map(tasks.map((task) => [task.taskId, task])).values()];
}

function currentDueDateTasks(
	snapshot: MetricsSnapshot,
	start: Date,
	end: Date,
) {
	const startDate = start.toISOString().slice(0, 10);
	const endDate = end.toISOString().slice(0, 10);
	return snapshot.dueDateTasks.filter(
		(task) => task.dueDate >= startDate && task.dueDate < endDate,
	);
}

export async function getDeveloperMetrics(
	port: MetricsQueryPort,
	teamId: string,
	assigneeId: string,
	previousStart: Date,
	start: Date,
	end: Date,
): Promise<DeveloperMetricsResult> {
	const snapshot = await port.loadSnapshot(
		teamId,
		previousStart,
		end,
		assigneeId,
	);
	const completed = getCompletedTasksForRange(snapshot, start, end);

	return {
		current: getMetricsForRange(snapshot, start, end),
		previous: getMetricsForRange(snapshot, previousStart, start),
		evidence: {
			delivered: completed.map(identity),
			predictability: currentDueDateTasks(snapshot, start, end).map(identity),
			cycleTime: completed
				.filter((task) =>
					task.statusChanges.some(
						(change) => change.toStatus === "IN_DEVELOPMENT",
					),
				)
				.map(identity),
			unplanned: completed
				.filter((task) => isUnplanned(task, start, end))
				.map(identity),
			rework: completed.filter(hasRework).map(identity),
			blocked: completed
				.filter((task) => task.blockedPeriods.length > 0)
				.map(identity),
			codeReview: completed
				.filter((task) =>
					task.statusChanges.some(
						(change) => change.toStatus === "CODE_REVIEW",
					),
				)
				.map(identity),
			testing: completed
				.filter((task) =>
					task.statusChanges.some((change) => change.toStatus === "TESTING"),
				)
				.map(identity),
			bugsAssociated: unique(
				snapshot.bugEvents.flatMap((event) =>
					event.createdAt >= start &&
					event.createdAt < end &&
					event.parentTaskId &&
					event.parentExternalId &&
					event.parentDescription
						? [
								{
									taskId: event.parentTaskId,
									externalId: event.parentExternalId,
									description: event.parentDescription,
								},
							]
						: [],
				),
			),
		},
	};
}
