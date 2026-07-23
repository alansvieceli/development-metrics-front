import { redirect } from "next/navigation";
import {
	createHistoricalTaskAction,
	createTaskAction,
	deleteTaskAction,
	moveTaskAction,
	toggleBlockedAction,
	updateTaskAction,
} from "@/app/board/actions";
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
	const tags = await taskUseCases.listTags();

	return (
		<KanbanBoard
			tasksByStatus={tasksByStatus}
			completedTaskLimit={currentTeam.completedTaskLimit}
			taskTypes={taskTypes}
			tags={tags}
			members={members}
			createTaskAction={createTaskAction}
			createHistoricalTaskAction={createHistoricalTaskAction}
			updateTaskAction={updateTaskAction}
			deleteTaskAction={deleteTaskAction}
			moveTaskAction={moveTaskAction}
			toggleBlockedAction={toggleBlockedAction}
		/>
	);
}
