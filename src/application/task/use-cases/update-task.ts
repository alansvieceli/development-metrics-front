import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { TagRepository } from "@/application/task/ports/tag-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import { validateTagIds } from "@/application/task/validate-tag-ids";
import type { TeamAccess } from "@/application/team/contracts/team-access";

export type UpdateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
	parentTaskId: string | null;
	tagIds?: string[];
};

export async function updateTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	teamId: string,
	taskId: string,
	input: UpdateTaskInput,
	tagRepository?: TagRepository,
) {
	const externalId = input.externalId.trim();
	const description = input.description.trim();
	if (!externalId) {
		throw new ApplicationError("Id externo não pode ser vazio");
	}
	if (!description) {
		throw new ApplicationError("Descrição não pode ser vazia");
	}
	const task = await repository.findById(taskId);
	if (!task || task.teamId !== teamId) {
		throw new ApplicationError("Task não encontrada");
	}
	if (!(await typeRepository.findById(input.typeId))) {
		throw new ApplicationError("Tipo de task não encontrado");
	}
	if (
		input.assigneeId &&
		!(await teamAccess.memberBelongsToTeam(input.assigneeId, teamId))
	) {
		throw new ApplicationError("Membro não pertence ao time");
	}
	if (!input.dueDate) {
		throw new ApplicationError("Data prevista é obrigatória");
	}
	if (!parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
	}
	if (input.parentTaskId) {
		if (input.parentTaskId === taskId) {
			throw new ApplicationError("Uma task não pode ser origem dela mesma");
		}
		const parentTask = await repository.findById(input.parentTaskId);
		if (!parentTask || parentTask.teamId !== teamId) {
			throw new ApplicationError("Task de origem não encontrada");
		}
	}
	if (tagRepository && input.tagIds) {
		await validateTagIds(tagRepository, input.tagIds);
	}
	const existing = await repository.findByExternalId(task.teamId, externalId);
	if (existing && existing.id !== taskId) {
		throw new ApplicationError(
			`Já existe uma task com o id externo "${externalId}" neste time`,
		);
	}
	return repository.update(taskId, {
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		dueDate: input.dueDate,
		parentTaskId: input.parentTaskId,
		tagIds: input.tagIds,
	});
}
