import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type TasksByStatus = Record<TaskStatus, Task[]>;

export async function listTasksByTeam(
	repository: TaskRepository,
	teamId: string,
): Promise<TasksByStatus> {
	const tasks = await repository.listByTeam(teamId);
	const grouped: TasksByStatus = {
		TODO: [],
		IN_DEVELOPMENT: [],
		CODE_REVIEW: [],
		DONE: [],
	};
	for (const task of tasks) {
		grouped[task.status].push(task);
	}
	return grouped;
}
