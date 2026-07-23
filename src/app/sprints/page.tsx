import { redirect } from "next/navigation";
import { createSprintUseCases } from "@/composition/sprint";
import { createTeamUseCases } from "@/composition/team";
import { ProgramIncrementForm } from "@/presentation/sprint/program-increment-form";
import { ProgramIncrementList } from "@/presentation/sprint/program-increment-list";
import { createProgramIncrementAction, createSprintAction } from "./actions";

export default async function SprintsPage() {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const sprintUseCases = createSprintUseCases();
	const programIncrements = await sprintUseCases.listProgramIncrementsByTeam(
		currentTeam.id,
	);
	const sprintsByPi = await Promise.all(
		programIncrements.map((pi) => sprintUseCases.listSprintsByPi(pi.id)),
	);

	return (
		<main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
			<h1 className="text-xl font-semibold">PIs e Sprints</h1>
			<ProgramIncrementList
				programIncrements={programIncrements.map((pi, index) => ({
					pi,
					sprints: sprintsByPi[index],
				}))}
				createSprintAction={createSprintAction}
			/>
			<ProgramIncrementForm createProgramIncrementAction={createProgramIncrementAction} />
		</main>
	);
}
