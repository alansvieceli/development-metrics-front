import { ApplicationError } from "@/application/shared/application-error";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
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
};

export async function createTask(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: CreateTaskInput,
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
	});
	return repository.createWithInitialHistory({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
		parentTaskId: null,
	});
}
