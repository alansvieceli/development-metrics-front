import type { CreateHistoricalTaskActionInput } from "@/app/board/actions";
import type { ActionState } from "@/application/shared/action-state";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { TasksByStatus } from "@/application/task/use-cases/list-tasks-by-team";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import type { Tag } from "@/domain/task/entities/tag";
import type { Task, TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { BoardSummary } from "@/presentation/task/board-summary";
import { HistoricalTaskFormModal } from "@/presentation/task/historical-task-form-modal";
import { TaskCard } from "@/presentation/task/task-card";
import { TaskFormModal } from "@/presentation/task/task-form-modal";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type KanbanBoardProps = {
	tasksByStatus: TasksByStatus;
	completedTaskLimit: number;
	taskTypes: TaskType[];
	tags: Tag[];
	members: Member[];
	createTaskAction: (
		input: Omit<CreateTaskInput, "teamId">,
	) => Promise<ActionState>;
	createHistoricalTaskAction: (
		input: CreateHistoricalTaskActionInput,
	) => Promise<ActionState>;
	updateTaskAction: (
		taskId: string,
		input: UpdateTaskInput,
	) => Promise<ActionState>;
	deleteTaskAction: (taskId: string) => Promise<ActionState>;
	moveTaskAction: (taskId: string, status: TaskStatus) => Promise<ActionState>;
	toggleBlockedAction: (
		taskId: string,
		blocked: boolean,
	) => Promise<ActionState>;
};

export function KanbanBoard({
	tasksByStatus,
	completedTaskLimit,
	taskTypes,
	tags,
	members,
	createTaskAction,
	createHistoricalTaskAction,
	updateTaskAction,
	deleteTaskAction,
	moveTaskAction,
	toggleBlockedAction,
}: KanbanBoardProps) {
	const taskTypesById = new Map(
		taskTypes.map((taskType) => [taskType.id, taskType]),
	);
	const membersById = new Map(members.map((member) => [member.id, member]));
	const teamTasks = Object.values(tasksByStatus)
		.flat()
		.map((task) => ({
			id: task.id,
			externalId: task.externalId,
			description: task.description,
		}))
		.sort((a, b) => a.externalId.localeCompare(b.externalId));
	function byCreationOrder(left: Task, right: Task): number {
		const diff = left.createdAt.getTime() - right.createdAt.getTime();
		return diff !== 0 ? diff : left.id.localeCompare(right.id);
	}

	const visibleTasksByStatus = {
		TODO: [...tasksByStatus.TODO].sort(byCreationOrder),
		IN_DEVELOPMENT: [...tasksByStatus.IN_DEVELOPMENT].sort(byCreationOrder),
		CODE_REVIEW: [...tasksByStatus.CODE_REVIEW].sort(byCreationOrder),
		TESTING: [...tasksByStatus.TESTING].sort(byCreationOrder),
		AWAITING_PUBLICATION: [...tasksByStatus.AWAITING_PUBLICATION].sort(
			byCreationOrder,
		),
		DONE: [...tasksByStatus.DONE]
			.sort(
				(left, right) =>
					right.statusChangedAt.getTime() - left.statusChangedAt.getTime(),
			)
			.slice(0, completedTaskLimit),
	};

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-2">
					<h1 className="text-xl font-semibold">Quadro</h1>
					<BoardSummary tasksByStatus={tasksByStatus} members={members} />
				</div>
				<div className="flex items-center gap-2">
					<HistoricalTaskFormModal
						taskTypes={taskTypes}
						members={members}
						tags={tags}
						createHistoricalTaskAction={createHistoricalTaskAction}
					/>
					<TaskFormModal
						mode="create"
						taskTypes={taskTypes}
						members={members}
						teamTasks={teamTasks}
						tags={tags}
						createTaskAction={createTaskAction}
					/>
				</div>
			</div>
			<hr className="border-(--border)" />
			<div className="flex flex-1 gap-2 overflow-x-auto md:gap-4">
				{STATUS_ORDER.map((status, index) => (
					<div
						key={status}
						data-testid={`column-${status}`}
						className={`flex min-w-0 flex-1 flex-col gap-3 p-2 ${
							index > 0 ? "border-l border-(--border)" : ""
						}`}
					>
						<h2 className="text-sm font-semibold text-balance opacity-70">
							{STATUS_LABELS[status]} ({tasksByStatus[status].length})
						</h2>
						{visibleTasksByStatus[status].map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								taskType={taskTypesById.get(task.typeId)}
								assignee={
									task.assigneeId ? membersById.get(task.assigneeId) : undefined
								}
								taskTypes={taskTypes}
								tags={tags}
								members={members}
								teamTasks={teamTasks}
								updateTaskAction={updateTaskAction}
								deleteTaskAction={deleteTaskAction}
								moveTaskAction={moveTaskAction}
								toggleBlockedAction={toggleBlockedAction}
							/>
						))}
					</div>
				))}
			</div>
		</div>
	);
}
