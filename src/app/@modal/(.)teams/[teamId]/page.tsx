import { notFound } from "next/navigation";
import { isUuid } from "@/application/shared/validation";
import { createTeamUseCases } from "@/composition/team";
import { RouteModal } from "@/presentation/shared/route-modal";
import { TeamManageView } from "@/presentation/team/team-manage-view";
import {
	addMemberAction,
	deleteTeamAction,
	removeMemberAction,
	renameMemberAction,
	renameTeamAction,
} from "../../../teams/[teamId]/actions";

export default async function ManageTeamModal({
	params,
}: {
	params: Promise<{ teamId: string }>;
}) {
	const { teamId } = await params;
	if (!isUuid(teamId)) {
		notFound();
	}
	const useCases = createTeamUseCases();
	const result = await useCases.getTeam(teamId);
	if (!result) {
		notFound();
	}
	const { team, members } = result;

	return (
		<RouteModal label="Gerenciar time">
			<TeamManageView
				team={team}
				members={members}
				renameTeamAction={renameTeamAction.bind(null, teamId)}
				addMemberAction={addMemberAction.bind(null, teamId)}
				renameMemberAction={renameMemberAction.bind(null, teamId)}
				removeMemberAction={removeMemberAction.bind(null, teamId)}
				deleteTeamAction={deleteTeamAction.bind(null, teamId)}
			/>
		</RouteModal>
	);
}
