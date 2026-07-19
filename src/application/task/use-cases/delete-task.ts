import { ApplicationError } from "@/application/shared/application-error";
import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function deleteTask(
	repository: TaskRepository,
	teamId: string,
	taskId: string,
) {
	const task = await repository.findById(taskId);
	if (!task || task.teamId !== teamId) {
		throw new ApplicationError("Task não encontrada");
	}
	await repository.delete(taskId);
}
