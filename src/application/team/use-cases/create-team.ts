import { ApplicationError } from "@/application/shared/application-error";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import {
	DEFAULT_WIP_LIMIT,
	isValidWipLimit,
} from "@/domain/team/entities/team";

export async function createTeam(
	repository: TeamRepository,
	name: string,
	wipLimit: number = DEFAULT_WIP_LIMIT,
) {
	const trimmed = name.trim();
	if (!trimmed) {
		throw new ApplicationError("Nome do time não pode ser vazio");
	}
	if (!isValidWipLimit(wipLimit)) {
		throw new ApplicationError(
			"Limite de WIP deve ser um número inteiro positivo",
		);
	}
	return repository.create(trimmed, wipLimit);
}
