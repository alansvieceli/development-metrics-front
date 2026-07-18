import type { CompletedTaskMetrics } from "@/application/metrics/ports/metrics-query-port";

export type DurationStats = { averageMs: number; medianMs: number };

export function computeDurationStats(durationsMs: number[]): DurationStats | null {
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

export function calculateCycleTime(
	tasks: CompletedTaskMetrics[],
): DurationStats | null {
	const durations = tasks
		.map((task) => {
			const firstInDevelopment = task.statusChanges
				.filter((change) => change.toStatus === "IN_DEVELOPMENT")
				.reduce<Date | null>(
					(earliest, change) =>
						!earliest || change.changedAt < earliest ? change.changedAt : earliest,
					null,
				);
			if (!firstInDevelopment) {
				return null;
			}
			return task.completedAt.getTime() - firstInDevelopment.getTime();
		})
		.filter((ms): ms is number => ms !== null);
	return computeDurationStats(durations);
}

export function calculateBlockedTime(
	tasks: CompletedTaskMetrics[],
	now: Date,
): DurationStats | null {
	const durations = tasks.map((task) =>
		task.blockedPeriods.reduce(
			(sum, period) =>
				sum + (period.unblockedAt ?? now).getTime() - period.blockedAt.getTime(),
			0,
		),
	);
	return computeDurationStats(durations);
}

export function calculateCodeReviewTime(
	tasks: CompletedTaskMetrics[],
): DurationStats | null {
	const durations = tasks.map((task) => {
		const sorted = [...task.statusChanges].sort(
			(a, b) => a.changedAt.getTime() - b.changedAt.getTime(),
		);
		let total = 0;
		for (let i = 0; i < sorted.length; i++) {
			const next = sorted[i + 1];
			if (sorted[i].toStatus === "CODE_REVIEW" && next) {
				total += next.changedAt.getTime() - sorted[i].changedAt.getTime();
			}
		}
		return total;
	});
	return computeDurationStats(durations);
}
