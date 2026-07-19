import { ApplicationError } from "@/application/shared/application-error";
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function toggleBlocked(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	teamId: string,
	taskId: string,
	blocked: boolean,
) {
	const task = await repository.findById(taskId);
	if (!task || task.teamId !== teamId) {
		throw new ApplicationError("Task não encontrada");
	}
	if (task.blocked === blocked) {
		return task;
	}
	if (blocked) {
		await historyRepository.openBlockedPeriod(taskId);
	} else {
		await historyRepository.closeBlockedPeriod(taskId);
	}
	return repository.updateBlocked(taskId, blocked);
}
