import { addMember } from "@/application/team/use-cases/add-member";
import { createTeam } from "@/application/team/use-cases/create-team";
import { deleteTeam } from "@/application/team/use-cases/delete-team";
import { getCurrentTeam } from "@/application/team/use-cases/get-current-team";
import { getTeam } from "@/application/team/use-cases/get-team";
import { listTeams } from "@/application/team/use-cases/list-teams";
import { removeMember } from "@/application/team/use-cases/remove-member";
import { renameMember } from "@/application/team/use-cases/rename-member";
import { renameTeam } from "@/application/team/use-cases/rename-team";
import { selectTeam } from "@/application/team/use-cases/select-team";
import { cookieCurrentTeamStore } from "@/infrastructure/team/cookie-current-team-store";
import { drizzleTeamRepository } from "@/infrastructure/team/drizzle-team-repository";

export function createTeamUseCases() {
	return {
		createTeam: (name: string) => createTeam(drizzleTeamRepository, name),
		renameTeam: (teamId: string, name: string) =>
			renameTeam(drizzleTeamRepository, teamId, name),
		deleteTeam: (teamId: string) => deleteTeam(drizzleTeamRepository, teamId),
		listTeams: () => listTeams(drizzleTeamRepository),
		getTeam: (teamId: string) => getTeam(drizzleTeamRepository, teamId),
		addMember: (teamId: string, name: string) =>
			addMember(drizzleTeamRepository, teamId, name),
		renameMember: (teamId: string, memberId: string, name: string) =>
			renameMember(drizzleTeamRepository, teamId, memberId, name),
		removeMember: (teamId: string, memberId: string) =>
			removeMember(drizzleTeamRepository, teamId, memberId),
		getCurrentTeam: () =>
			getCurrentTeam(cookieCurrentTeamStore, drizzleTeamRepository),
		selectTeam: (teamId: string) =>
			selectTeam(cookieCurrentTeamStore, drizzleTeamRepository, teamId),
	};
}
