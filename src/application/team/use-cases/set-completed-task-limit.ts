import { ApplicationError } from "@/application/shared/application-error";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function setCompletedTaskLimit(
	repository: TeamRepository,
	teamId: string,
	completedTaskLimit: number,
) {
	if (!Number.isInteger(completedTaskLimit) || completedTaskLimit < 1) {
		throw new ApplicationError(
			"Limite de tarefas concluídas deve ser um número inteiro positivo",
		);
	}
	return repository.setCompletedTaskLimit(teamId, completedTaskLimit);
}
