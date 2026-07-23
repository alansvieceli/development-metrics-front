import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { Tag } from "@/domain/task/entities/tag";

export type TagWithUsage = Tag & { inUse: boolean };

export async function listTags(
	tagRepository: TagRepository,
	taskRepository: TaskRepository,
): Promise<TagWithUsage[]> {
	const [tags, usedTagIds] = await Promise.all([
		tagRepository.listAll(),
		taskRepository.listUsedTagIds(),
	]);
	const used = new Set(usedTagIds);
	return tags.map((tag) => ({ ...tag, inUse: used.has(tag.id) }));
}
