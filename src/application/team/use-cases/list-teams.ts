import type { TeamRepository } from "@/application/team/ports/team-repository";

export function listTeams(repository: TeamRepository) {
	return repository.listAll();
}
