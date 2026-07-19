import { ApplicationError } from "@/application/shared/application-error";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskStatus } from "@/domain/task/entities/task";

export async function moveTask(
	repository: TaskRepository,
	teamId: string,
	taskId: string,
	toStatus: TaskStatus,
) {
	const task = await repository.findById(taskId);
	if (!task || task.teamId !== teamId) {
		throw new ApplicationError("Task não encontrada");
	}
	return repository.moveWithHistory(taskId, toStatus);
}
