import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskStatusChange } from "@/domain/task/entities/task-status-change";

export type FakeTaskHistoryRepository = TaskHistoryRepository & {
	statusChanges: TaskStatusChange[];
	seedStatusChange(change: Omit<TaskStatusChange, "id">): void;
};

export function createFakeTaskHistoryRepository(): FakeTaskHistoryRepository {
	const statusChanges: TaskStatusChange[] = [];
	let nextId = 1;

	return {
		statusChanges,
		seedStatusChange(change) {
			statusChanges.push({ id: `status-change-${nextId++}`, ...change });
		},
		async getStatusChangedAtForTasks(taskIds) {
			const result: Record<string, Date> = {};
			for (const taskId of taskIds) {
				const latest = statusChanges
					.filter((change) => change.taskId === taskId)
					.reduce<Date | undefined>(
						(latestSoFar, change) =>
							!latestSoFar || change.changedAt > latestSoFar
								? change.changedAt
								: latestSoFar,
						undefined,
					);
				if (latest) result[taskId] = latest;
			}
			return result;
		},
	};
}
