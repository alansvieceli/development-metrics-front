import { createTeamUseCases } from "@/composition/team";
import { TeamSelectView } from "@/presentation/team/team-select-view";
import { selectTeamAction } from "../actions";
import { createTeamAction } from "./actions";

export default async function TeamsPage() {
	const useCases = createTeamUseCases();
	const teams = await useCases.listTeams();

	return (
		<main className="mx-auto flex max-w-md flex-col gap-6 p-6">
			<TeamSelectView
				teams={teams}
				createTeamAction={createTeamAction}
				selectTeamAction={selectTeamAction}
			/>
		</main>
	);
}
