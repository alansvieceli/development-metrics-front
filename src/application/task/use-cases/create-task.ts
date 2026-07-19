import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { TaskHistoryRepository } from "@/application/task/ports/task-history-repository";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TeamAccess } from "@/application/team/contracts/team-access";
import type { TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string | null;
};

export async function createTask(
	repository: TaskRepository,
	historyRepository: TaskHistoryRepository,
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
	if (!(await teamAccess.teamExists(input.teamId))) {
		throw new ApplicationError("Time não encontrado");
	}
	if (!(await typeRepository.findById(input.typeId))) {
		throw new ApplicationError("Tipo de task não encontrado");
	}
	if (
		input.assigneeId &&
		!(await teamAccess.memberBelongsToTeam(input.assigneeId, input.teamId))
	) {
		throw new ApplicationError("Membro não pertence ao time");
	}
	if (input.dueDate !== null && !parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
	}
	const existing = await repository.findByExternalId(input.teamId, externalId);
	if (existing) {
		throw new ApplicationError(
			`Já existe uma task com o id externo "${externalId}" neste time`,
		);
	}
	const task = await repository.create({
		externalId,
		description,
		typeId: input.typeId,
		assigneeId: input.assigneeId,
		teamId: input.teamId,
		status: input.status,
		dueDate: input.dueDate,
	});
	await historyRepository.recordStatusChange(task.id, null, task.status);
	return task;
}
