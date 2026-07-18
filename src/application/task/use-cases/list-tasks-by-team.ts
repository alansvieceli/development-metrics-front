import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type TaskWithStatusSince = Task & { statusChangedAt: Date };
export type TasksByStatus = Record<TaskStatus, TaskWithStatusSince[]>;

export async function listTasksByTeam(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	teamId: string,
): Promise<TasksByStatus> {
	const tasks = await repository.listByTeam(teamId);
	const changedAtByTaskId = await historyRepository.getStatusChangedAtForTasks(
		tasks.map((task) => task.id),
	);
	const grouped: TasksByStatus = {
		TODO: [],
		IN_DEVELOPMENT: [],
		CODE_REVIEW: [],
		DONE: [],
	};
	for (const task of tasks) {
		grouped[task.status].push({
			...task,
			statusChangedAt: changedAtByTaskId[task.id] ?? task.createdAt,
		});
	}
	return grouped;
}
