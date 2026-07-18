import { createTeamUseCases } from "@/composition/team";
import { Modal } from "@/presentation/shared/modal";
import { TeamSelectView } from "@/presentation/team/team-select-view";
import { selectTeamAction } from "../../actions";
import { createTeamAction } from "../../teams/actions";

export default async function TeamsModal() {
	const useCases = createTeamUseCases();
	const teams = await useCases.listTeams();

	return (
		<Modal>
			<TeamSelectView
				teams={teams}
				createTeamAction={createTeamAction}
				selectTeamAction={selectTeamAction}
			/>
		</Modal>
	);
}
