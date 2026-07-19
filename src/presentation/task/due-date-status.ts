import type { TaskStatus } from "@/domain/task/entities/task";

export type DueDateStatus = "none" | "ok" | "warning" | "overdue";

const WARNING_THRESHOLD_DAYS = 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDueDateStatus(
	dueDate: string,
	status: TaskStatus,
	today: Date,
): DueDateStatus {
	if (status === "DONE") {
		return "none";
	}
	const due = new Date(`${dueDate}T00:00:00Z`);
	const startOfToday = Date.UTC(
		today.getUTCFullYear(),
		today.getUTCMonth(),
		today.getUTCDate(),
	);
	const diffDays = Math.round((due.getTime() - startOfToday) / MS_PER_DAY);
	if (diffDays < 0) {
		return "overdue";
	}
	if (diffDays <= WARNING_THRESHOLD_DAYS) {
		return "warning";
	}
	return "ok";
}
