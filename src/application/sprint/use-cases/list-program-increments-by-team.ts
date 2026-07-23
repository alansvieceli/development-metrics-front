import type { ProgramIncrementRepository } from "@/application/sprint/ports/program-increment-repository";

export async function listProgramIncrementsByTeam(
	repository: ProgramIncrementRepository,
	teamId: string,
) {
	return repository.listByTeam(teamId);
}
