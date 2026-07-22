import type { CompletedTaskMetrics } from "@/application/metrics/ports/metrics-query-port";
import type { TaskStatus } from "@/domain/task/entities/task";

export type DurationStats = { averageMs: number; medianMs: number };

export function computeDurationStats(
	durationsMs: number[],
): DurationStats | null {
	if (durationsMs.length === 0) {
		return null;
	}
	const sorted = [...durationsMs].sort((a, b) => a - b);
	const averageMs = sorted.reduce((sum, ms) => sum + ms, 0) / sorted.length;
	const middle = Math.floor(sorted.length / 2);
	const medianMs =
		sorted.length % 2 === 0
			? (sorted[middle - 1] + sorted[middle]) / 2
			: sorted[middle];
	return { averageMs, medianMs };
}

export function calculateLeadTime(
	tasks: CompletedTaskMetrics[],
): DurationStats | null {
	return computeDurationStats(
		tasks.map((task) => task.completedAt.getTime() - task.createdAt.getTime()),
	);
}

function firstOccurrence(
	statusChanges: CompletedTaskMetrics["statusChanges"],
	status: TaskStatus,
): Date | null {
	return statusChanges
		.filter((change) => change.toStatus === status)
		.reduce<Date | null>(
			(earliest, change) =>
				!earliest || change.changedAt < earliest ? change.changedAt : earliest,
			null,
		);
}

export function calculateCycleTime(
	tasks: CompletedTaskMetrics[],
): DurationStats | null {
	const durations = tasks
		.map((task) => {
			const firstInDevelopment = firstOccurrence(
				task.statusChanges,
				"IN_DEVELOPMENT",
			);
			if (!firstInDevelopment) {
				return null;
			}
			return task.completedAt.getTime() - firstInDevelopment.getTime();
		})
		.filter((ms): ms is number => ms !== null);
	return computeDurationStats(durations);
}

export type CycleTimeOutlier = {
	taskId: string;
	externalId: string;
	cycleTimeMs: number;
};

const CYCLE_TIME_OUTLIERS_LIMIT = 5;

export function calculateCycleTimeOutliers(
	tasks: CompletedTaskMetrics[],
): CycleTimeOutlier[] {
	return tasks
		.map((task): CycleTimeOutlier | null => {
			const firstInDevelopment = firstOccurrence(
				task.statusChanges,
				"IN_DEVELOPMENT",
			);
			if (!firstInDevelopment) {
				return null;
			}
			return {
				taskId: task.taskId,
				externalId: task.externalId,
				cycleTimeMs: task.completedAt.getTime() - firstInDevelopment.getTime(),
			};
		})
		.filter((entry): entry is CycleTimeOutlier => entry !== null)
		.sort((a, b) => b.cycleTimeMs - a.cycleTimeMs)
		.slice(0, CYCLE_TIME_OUTLIERS_LIMIT);
}

export function calculateBlockedTime(
	tasks: CompletedTaskMetrics[],
	now: Date,
): DurationStats | null {
	const durations = tasks.map((task) =>
		task.blockedPeriods.reduce(
			(sum, period) =>
				sum +
				(period.unblockedAt ?? now).getTime() -
				period.blockedAt.getTime(),
			0,
		),
	);
	return computeDurationStats(durations);
}

export function calculateTimeInStatus(
	tasks: CompletedTaskMetrics[],
	status: TaskStatus,
): DurationStats | null {
	const durations = tasks.map((task) => {
		const sorted = [...task.statusChanges].sort(
			(a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
		);
		let total = 0;
		for (let i = 0; i < sorted.length; i++) {
			const next = sorted[i + 1];
			if (sorted[i].toStatus === status && next) {
				total += next.changedAt.getTime() - sorted[i].changedAt.getTime();
			}
		}
		return total;
	});
	return computeDurationStats(durations);
}
