import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
} from "@/application/metrics/ports/metrics-query-port";

export function calculateReworkRate(
	tasks: CompletedTaskMetrics[],
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	const reworkCount = tasks.filter((task) =>
		task.statusChanges.some(
			(change) =>
				change.toStatus === "IN_DEVELOPMENT" &&
				change.fromStatus !== null &&
				change.fromStatus !== "TODO" &&
				change.fromStatus !== "IN_DEVELOPMENT",
		),
	).length;
	return (reworkCount / tasks.length) * 100;
}

export type PredictabilityCounts = {
	planned: number;
	delivered: number;
};

export function calculatePredictabilityCounts(
	tasks: DueDateTaskMetrics[],
): PredictabilityCounts | null {
	if (tasks.length === 0) {
		return null;
	}
	const delivered = tasks.filter(
		(task) =>
			task.firstCompletedAt !== null &&
			task.firstCompletedAt.getTime() <= endOfDay(task.dueDate).getTime(),
	).length;
	return { planned: tasks.length, delivered };
}

export function calculatePredictability(
	tasks: DueDateTaskMetrics[],
): number | null {
	const counts = calculatePredictabilityCounts(tasks);
	return counts ? (counts.delivered / counts.planned) * 100 : null;
}

function endOfDay(dateOnly: string): Date {
	return new Date(`${dateOnly}T23:59:59.999Z`);
}
