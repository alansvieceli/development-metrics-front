import type { TeamRepository } from "@/application/team/ports/team-repository";
import type { Member } from "@/domain/team/entities/member";
import type { Team } from "@/domain/team/entities/team";

export type TeamWithMembers = {
	team: Team;
	members: Member[];
};

export async function getTeam(
	repository: TeamRepository,
	teamId: string,
): Promise<TeamWithMembers | null> {
	const team = await repository.findById(teamId);
	if (!team) {
		return null;
	}
	const members = await repository.listMembers(teamId);
	return { team, members };
}
