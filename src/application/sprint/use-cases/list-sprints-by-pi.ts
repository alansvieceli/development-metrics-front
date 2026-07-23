import type { SprintRepository } from "@/application/sprint/ports/sprint-repository";

export async function listSprintsByPi(repository: SprintRepository, piId: string) {
	return repository.listByPi(piId);
}
