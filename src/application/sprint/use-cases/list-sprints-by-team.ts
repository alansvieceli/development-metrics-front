import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";

export async function listSprintsByTeam(
	repository: SprintRepository,
	teamId: string,
) {
	return repository.listByTeam(teamId);
}
