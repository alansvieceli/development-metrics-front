import { ApplicationError } from "@/application/shared/application-error";
import type { SprintAccess } from "@/application/sprint/contracts/sprint-access";
import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { validateSprintId } from "@/application/task/validate-sprint-id";
import { validateTagIds } from "@/application/task/validate-tag-ids";
import { validateTaskReferences } from "@/application/task/validate-task-references";
import type { TeamAccess } from "@/application/team/contracts/team-access";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string;
	parentTaskId: string | null;
	sprintId?: string | null;
	tagIds?: string[];
};

export async function createTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: CreateTaskInput,
	tagRepository?: TagRepository,
	sprintAccess?: SprintAccess,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new ApplicationError("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new ApplicationError("Descrição não pode ser vazia");
	}
	await validateTaskReferences(repository, typeRepository, teamAccess, {
		teamId: input.teamId,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		externalId,
		parentTaskId: input.parentTaskId,
	});
	if (tagRepository && input.tagIds) {
		await validateTagIds(tagRepository, input.tagIds);
	}
	if (sprintAccess && input.sprintId) {
		await validateSprintId(sprintAccess, input.sprintId, input.teamId);
	}
	return repository.createWithInitialHistory({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
		parentTaskId: input.parentTaskId,
		sprintId: input.sprintId ?? null,
		tagIds: input.tagIds,
	});
}
