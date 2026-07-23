import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";

export async function deleteTag(
	tagRepository: TagRepository,
	taskRepository: TaskRepository,
	tagId: string,
) {
	const tasksUsingTag = await taskRepository.countByTag(tagId);
	if (tasksUsingTag > 0) {
		throw new Error(
			"Não é possível excluir uma tarja que está em uso por tasks",
		);
	}
	await tagRepository.delete(tagId);
}
