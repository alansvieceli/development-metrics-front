import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function deleteTeam(repository: TeamRepository, teamId: string) {
	await repository.delete(teamId);
}
