import { ApplicationError } from "@/application/shared/application-error";
import type { TagRepository } from "@/application/task/ports/tag-repository";

const MAX_TAGS_PER_TASK = 3;

export async function validateTagIds(
	repository: TagRepository,
	tagIds: string[],
) {
	if (tagIds.length > MAX_TAGS_PER_TASK) {
		throw new ApplicationError("Uma task pode ter no máximo 3 tarjas");
	}
	for (const tagId of tagIds) {
		if (!(await repository.findById(tagId))) {
			throw new ApplicationError("Tarja não encontrada");
		}
	}
}
