import type {
	CompletedTaskMetrics,
	DueDateTaskMetrics,
} from "@/application/metrics/ports/metrics-query-port";

function isReworkTransition(change: {
	fromStatus: string | null;
	toStatus: string;
}): boolean {
	return (
		change.toStatus === "IN_DEVELOPMENT" &&
		change.fromStatus !== null &&
		change.fromStatus !== "TODO" &&
		change.fromStatus !== "IN_DEVELOPMENT"
	);
}

export function calculateReworkCount(
	tasks: CompletedTaskMetrics[],
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	return tasks.filter((task) => task.statusChanges.some(isReworkTransition))
		.length;
}

export function calculateReworkRate(
	tasks: CompletedTaskMetrics[],
): number | null {
	const reworkCount = calculateReworkCount(tasks);
	return reworkCount === null ? null : (reworkCount / tasks.length) * 100;
}

export function calculateUnplannedCount(
	tasks: CompletedTaskMetrics[],
	periodStart: Date,
	periodEnd: Date,
): number | null {
	if (tasks.length === 0) {
		return null;
	}
	const startDate = periodStart.toISOString().slice(0, 10);
	const endDate = periodEnd.toISOString().slice(0, 10);
	return tasks.filter(
		(task) => task.dueDate < startDate || task.dueDate >= endDate,
	).length;
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
