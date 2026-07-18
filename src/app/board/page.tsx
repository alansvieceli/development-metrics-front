import { redirect } from "next/navigation";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { KanbanBoard } from "@/presentation/task/kanban-board";

export default async function BoardPage() {
	const teamUseCases = createTeamUseCases();
	const currentTeam = await teamUseCases.getCurrentTeam();
	if (!currentTeam) {
		redirect("/teams");
	}

	const teamResult = await teamUseCases.getTeam(currentTeam.id);
	const members = teamResult?.members ?? [];

	const taskUseCases = createTaskUseCases();
	const tasksByStatus = await taskUseCases.listTasksByTeam(currentTeam.id);
	const taskTypes = await taskUseCases.listTaskTypes();

	return (
		<KanbanBoard
			teamId={currentTeam.id}
			tasksByStatus={tasksByStatus}
			taskTypes={taskTypes}
			members={members}
		/>
	);
}
