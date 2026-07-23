import { redirect } from "next/navigation";
import {
	createHistoricalTaskAction,
	createTaskAction,
	deleteTaskAction,
	finishSprintAction,
	moveTaskAction,
	startSprintAction,
	toggleBlockedAction,
	updateTaskAction,
} from "@/app/board/actions";
import { createSprintUseCases } from "@/composition/sprint";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { filterTasksByStatusBySprint } from "@/presentation/task/filter-tasks-by-sprint";
import { KanbanBoard } from "@/presentation/task/kanban-board";
import { SprintHistoryBoard } from "@/presentation/task/sprint-history-board";

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

	const sprintUseCases = createSprintUseCases();
	const sprints = await sprintUseCases.listSprintsByTeam(currentTeam.id);
	const { sprintId } = await searchParams;
	const selectedSprint = sprintId
		? sprints.find((sprint) => sprint.id === sprintId)
		: undefined;

	if (selectedSprint?.status === "CLOSED") {
		const snapshots = await sprintUseCases.getSprintHistory(selectedSprint.id);
		return (
			<SprintHistoryBoard
				sprint={selectedSprint}
				snapshots={snapshots}
				sprints={sprints}
			/>
		);
	}

	const teamResult = await teamUseCases.getTeam(currentTeam.id);
	const members = teamResult?.members ?? [];

	const taskUseCases = createTaskUseCases();
	const tasksByStatus = await taskUseCases.listTasksByTeam(currentTeam.id);
	const taskTypes = await taskUseCases.listTaskTypes();
	const tags = await taskUseCases.listTags();

	const boardTasksByStatus = selectedSprint
		? filterTasksByStatusBySprint(tasksByStatus, selectedSprint.id)
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
			startSprintAction={startSprintAction}
			finishSprintAction={finishSprintAction}
		/>
	);
}
