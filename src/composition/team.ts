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
import { setBusinessmapBoardId } from "@/application/team/use-cases/set-businessmap-board-id";
import { setCompletedTaskLimit } from "@/application/team/use-cases/set-completed-task-limit";
import { setWipLimit } from "@/application/team/use-cases/set-wip-limit";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";
import { cookieCurrentTeamStore } from "@/infrastructure/team/cookie-current-team-store";
import { drizzleTeamRepository } from "@/infrastructure/team/drizzle-team-repository";

export function createTeamUseCases() {
	return {
		createTeam: (name: string, wipLimit?: number) =>
			createTeam(drizzleTeamRepository, name, wipLimit),
		renameTeam: (teamId: string, name: string) =>
			renameTeam(drizzleTeamRepository, teamId, name),
		deleteTeam: (teamId: string) =>
			deleteTeam(drizzleTeamRepository, drizzleTaskRepository, teamId),
		listTeams: () => listTeams(drizzleTeamRepository),
		getTeam: (teamId: string) => getTeam(drizzleTeamRepository, teamId),
		addMember: (teamId: string, name: string) =>
			addMember(drizzleTeamRepository, teamId, name),
		renameMember: (teamId: string, memberId: string, name: string) =>
			renameMember(drizzleTeamRepository, teamId, memberId, name),
		removeMember: (teamId: string, memberId: string) =>
			removeMember(
				drizzleTeamRepository,
				drizzleTaskRepository,
				teamId,
				memberId,
			),
		getCurrentTeam: () =>
			getCurrentTeam(cookieCurrentTeamStore, drizzleTeamRepository),
		selectTeam: (teamId: string) =>
			selectTeam(cookieCurrentTeamStore, drizzleTeamRepository, teamId),
		setWipLimit: (teamId: string, wipLimit: number) =>
			setWipLimit(drizzleTeamRepository, teamId, wipLimit),
		setCompletedTaskLimit: (teamId: string, completedTaskLimit: number) =>
			setCompletedTaskLimit(drizzleTeamRepository, teamId, completedTaskLimit),
		setBusinessmapBoardId: (teamId: string, businessmapBoardId: string) =>
			setBusinessmapBoardId(drizzleTeamRepository, teamId, businessmapBoardId),
	};
}
