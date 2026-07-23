import type { TasksByStatus } from "@/application/task/use-cases/list-tasks-by-team";

export function filterTasksByStatusBySprint(
	tasksByStatus: TasksByStatus,
	sprintId: string,
): TasksByStatus {
	const entries = Object.entries(tasksByStatus) as [
		keyof TasksByStatus,
		TasksByStatus[keyof TasksByStatus],
	][];
	return Object.fromEntries(
		entries.map(([status, tasks]) => [
			status,
			tasks.filter((task) => task.sprintId === sprintId),
		]),
	) as TasksByStatus;
}
