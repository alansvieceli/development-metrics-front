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

export function calculatePredictability(
	tasks: DueDateTaskMetrics[],
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	const metCount = tasks.filter(
		(task) =>
			task.firstCompletedAt !== null &&
			task.firstCompletedAt.getTime() <= endOfDay(task.dueDate).getTime(),
	).length;
	return (metCount / tasks.length) * 100;
}

function endOfDay(dateOnly: string): Date {
	return new Date(`${dateOnly}T23:59:59.999Z`);
}
