import { redirect } from "next/navigation";
import {
	createHistoricalTaskAction,
	createTaskAction,
	deleteTaskAction,
	moveTaskAction,
	toggleBlockedAction,
	updateTaskAction,
} from "@/app/board/actions";
import { createSprintUseCases } from "@/composition/sprint";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { filterTasksByStatusBySprint } from "@/presentation/task/filter-tasks-by-sprint";
import { KanbanBoard } from "@/presentation/task/kanban-board";

export default async function BoardPage({
	searchParams,
}: {
	searchParams: Promise<{ sprintId?: string }>;
}) {
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
	const sprints = await createSprintUseCases().listSprintsByTeam(
		currentTeam.id,
	);

	const { sprintId } = await searchParams;
	const boardTasksByStatus =
		sprintId && sprints.some((sprint) => sprint.id === sprintId)
			? filterTasksByStatusBySprint(tasksByStatus, sprintId)
			: tasksByStatus;

	return (
		<KanbanBoard
			tasksByStatus={boardTasksByStatus}
			completedTaskLimit={currentTeam.completedTaskLimit}
			taskTypes={taskTypes}
			tags={tags}
			sprints={sprints}
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
