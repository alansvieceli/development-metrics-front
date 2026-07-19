import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";

export async function deleteTaskType(
	taskTypeRepository: TaskTypeRepository,
	taskRepository: TaskRepository,
	typeId: string,
) {
	const taskType = await taskTypeRepository.findById(typeId);
	if (taskType?.isBug) {
		throw new Error("O tipo Bug não pode ser excluído");
	}
	const tasksUsingType = await taskRepository.countByType(typeId);
	if (tasksUsingType > 0) {
		throw new Error(
			"Não é possível excluir um tipo de task que está em uso por tasks",
		);
	}
	await taskTypeRepository.delete(typeId);
}
