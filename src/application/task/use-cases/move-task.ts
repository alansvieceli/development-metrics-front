import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskStatus } from "@/domain/task/entities/task";

export async function moveTask(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
	taskId: string,
	toStatus: TaskStatus,
) {
	const task = await repository.findById(taskId);
	if (!task) {
		throw new Error("Task não encontrada");
	}
	const fromStatus = task.status;
	if (fromStatus === toStatus) {
		return task;
	}
	const updated = await repository.updateStatus(taskId, toStatus);
	await historyRepository.recordStatusChange(taskId, fromStatus, toStatus);
	return updated;
}
