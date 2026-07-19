import { isUuid } from "@/application/shared/validation";
import type { CurrentTeamStore } from "@/application/team/ports/current-team-store";
import type { TeamRepository } from "@/application/team/ports/team-repository";

export async function selectTeam(
	store: CurrentTeamStore,
	repository: TeamRepository,
	teamId: string,
) {
	if (!isUuid(teamId) || !(await repository.findById(teamId))) {
		throw new Error("Time não encontrado");
	}
	await store.set(teamId);
}
