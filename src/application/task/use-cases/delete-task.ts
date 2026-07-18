import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function deleteTask(repository: TaskRepository, taskId: string) {
	await repository.delete(taskId);
}
