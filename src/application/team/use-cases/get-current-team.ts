import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";
import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { Team } from "@/domain/team/entities/team";

export async function getCurrentTeam(
	store: CurrentTeamStore,
	repository: TeamRepository,
): Promise<Team | null> {
	const teamId = await store.get();
	if (!teamId) {
		return null;
	}
	return repository.findById(teamId);
}
