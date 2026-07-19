import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { TasksByStatus } from "@/application/task/use-cases/list-tasks-by-team";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import type { TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { TaskCard } from "@/presentation/task/task-card";
import { TaskFormModal } from "@/presentation/task/task-form-modal";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type KanbanBoardProps = {
	tasksByStatus: TasksByStatus;
	taskTypes: TaskType[];
	members: Member[];
	createTaskAction: (input: Omit<CreateTaskInput, "teamId">) => Promise<void>;
	updateTaskAction: (taskId: string, input: UpdateTaskInput) => Promise<void>;
	deleteTaskAction: (taskId: string) => Promise<void>;
	moveTaskAction: (taskId: string, status: TaskStatus) => Promise<void>;
	toggleBlockedAction: (taskId: string, blocked: boolean) => Promise<void>;
};

export function KanbanBoard({
	tasksByStatus,
	taskTypes,
	members,
	createTaskAction,
	updateTaskAction,
	deleteTaskAction,
	moveTaskAction,
	toggleBlockedAction,
}: KanbanBoardProps) {
	const taskTypesById = new Map(
		taskTypes.map((taskType) => [taskType.id, taskType]),
	);
	const membersById = new Map(members.map((member) => [member.id, member]));

	return (
		<div className="flex flex-1 flex-col gap-4 p-6">
			<div className="flex items-center justify-between">
				<h1 className="text-xl font-semibold">Quadro</h1>
				<TaskFormModal
					mode="create"
					taskTypes={taskTypes}
					members={members}
					createTaskAction={createTaskAction}
				/>
			</div>
			<div className="flex flex-1 gap-4 overflow-x-auto">
				{STATUS_ORDER.map((status, index) => (
					<div
						key={status}
						data-testid={`column-${status}`}
						className={`flex min-w-64 flex-1 flex-col gap-3 p-2 ${
							index > 0 ? "border-l border-(--border)" : ""
						}`}
					>
						<h2 className="text-sm font-semibold opacity-70">
							{STATUS_LABELS[status]}
						</h2>
						{tasksByStatus[status].map((task) => (
							<TaskCard
								key={task.id}
								task={task}
								taskType={taskTypesById.get(task.typeId)}
								assignee={
									task.assigneeId ? membersById.get(task.assigneeId) : undefined
								}
								taskTypes={taskTypes}
								members={members}
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
