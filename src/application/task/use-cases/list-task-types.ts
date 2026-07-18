import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TaskType } from "@/domain/task/entities/task-type";

export type TaskTypeWithUsage = TaskType & { inUse: boolean };

export async function listTaskTypes(
	taskTypeRepository: TaskTypeRepository,
	taskRepository: TaskRepository,
): Promise<TaskTypeWithUsage[]> {
	const taskTypes = await taskTypeRepository.listAll();
	return Promise.all(
		taskTypes.map(async (taskType) => ({
			...taskType,
			inUse: (await taskRepository.countByType(taskType.id)) > 0,
		})),
	);
}
