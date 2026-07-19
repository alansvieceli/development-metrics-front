import { createTeamUseCases } from "@/composition/team";
import { RouteModal } from "@/presentation/shared/route-modal";
import { TeamSelectView } from "@/presentation/team/team-select-view";
import { selectTeamAction } from "../../actions";
import { createTeamAction } from "../../teams/actions";

export default async function TeamsModal() {
	const useCases = createTeamUseCases();
	const teams = await useCases.listTeams();

	return (
		<RouteModal label="Selecionar time">
			<TeamSelectView
				teams={teams}
				createTeamAction={createTeamAction}
				selectTeamAction={selectTeamAction}
			/>
		</RouteModal>
	);
}
