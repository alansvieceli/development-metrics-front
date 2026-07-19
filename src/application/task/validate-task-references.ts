import { ApplicationError } from "@/application/shared/application-error";
import { parseDateOnly } from "@/application/shared/validation";
import type { TaskRepository } from "@/application/task/ports/task-repository";
import type { TaskTypeRepository } from "@/application/task/ports/task-type-repository";
import type { TeamAccess } from "@/application/team/contracts/team-access";

export async function validateTaskReferences(
	repository: TaskRepository,
	typeRepository: TaskTypeRepository,
	teamAccess: TeamAccess,
	input: {
		teamId: string;
		typeId: string;
		assigneeId: string | null;
		dueDate: string;
		externalId: string;
	},
) {
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
	if (!input.dueDate) {
		throw new ApplicationError("Data prevista é obrigatória");
	}
	if (!parseDateOnly(input.dueDate)) {
		throw new ApplicationError("Data prevista inválida");
	}
	const existing = await repository.findByExternalId(
		input.teamId,
		input.externalId,
	);
	if (existing) {
		throw new ApplicationError(
			`Já existe uma task com o id externo "${input.externalId}" neste time`,
		);
	}
}
