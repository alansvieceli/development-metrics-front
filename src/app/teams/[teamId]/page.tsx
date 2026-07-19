import { notFound } from "next/navigation";
import { isUuid } from "@/application/shared/validation";
import { createTeamUseCases } from "@/composition/team";
import { TeamManageView } from "@/presentation/team/team-manage-view";
import {
	addMemberAction,
	deleteTeamAction,
	removeMemberAction,
	renameMemberAction,
	renameTeamAction,
} from "./actions";

export default async function ManageTeamPage({
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
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<TeamManageView
				team={team}
				members={members}
				renameTeamAction={renameTeamAction.bind(null, teamId)}
				addMemberAction={addMemberAction.bind(null, teamId)}
				renameMemberAction={renameMemberAction.bind(null, teamId)}
				removeMemberAction={removeMemberAction.bind(null, teamId)}
				deleteTeamAction={deleteTeamAction.bind(null, teamId)}
			/>
		</main>
	);
}
