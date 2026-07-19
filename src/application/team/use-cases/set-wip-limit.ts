import { ApplicationError } from "@/application/shared/application-error";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import { isValidWipLimit } from "@/domain/team/entities/team";

export async function setWipLimit(
	repository: TeamRepository,
	teamId: string,
	wipLimit: number,
) {
	if (!isValidWipLimit(wipLimit)) {
		throw new ApplicationError(
			"Limite de WIP deve ser um número inteiro positivo",
		);
	}
	return repository.setWipLimit(teamId, wipLimit);
}
