import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { createHistoricalTask } from "@/application/task/use-cases/create-historical-task";
import type { CardImportPreview } from "@/application/task/use-cases/preview-card-import";
import type { TeamAccess } from "@/application/team/contracts/team-access";

export async function importCard(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	teamId: string,
	preview: CardImportPreview,
	typeId: string,
	tagIds?: string[],
	tagRepository?: TagRepository,
) {
	const task = await createHistoricalTask(
		repository,
		typeRepository,
		teamAccess,
		{
			externalId: preview.externalId,
			description: preview.description,
			typeId,
			assigneeId: preview.resolvedAssigneeId,
			teamId,
			dueDate: preview.dueDate,
			steps: preview.steps,
			tagIds,
		},
		tagRepository,
	);
	if (preview.blocked) {
		return repository.setBlockedWithHistory(task.id, true);
	}
	return task;
}
