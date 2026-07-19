import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";

export type TaskTypeWithUsage = TaskType & { inUse: boolean };

export async function listTaskTypes(
	taskTypeRepository: TaskTypeRepository,
	taskRepository: TaskRepository,
): Promise<TaskTypeWithUsage[]> {
	const [taskTypes, usedTypeIds] = await Promise.all([
		taskTypeRepository.listAll(),
		taskRepository.listUsedTypeIds(),
	]);
	const used = new Set(usedTypeIds);
	return taskTypes.map((taskType) => ({
		...taskType,
		inUse: used.has(taskType.id),
	}));
}
