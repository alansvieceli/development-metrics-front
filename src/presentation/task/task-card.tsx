import type { TaskWithStatusSince } from "@/application/task/use-cases/list-tasks-by-team";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import type { TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { TaskFormModal } from "@/presentation/task/task-form-modal";
import { TaskMoveSelect } from "@/presentation/task/task-move-select";

type TaskCardProps = {
	task: TaskWithStatusSince;
	taskType: TaskType | undefined;
	assignee: Member | undefined;
	taskTypes: TaskType[];
	members: Member[];
	updateTaskAction: (taskId: string, input: UpdateTaskInput) => Promise<void>;
	deleteTaskAction: (taskId: string) => Promise<void>;
	moveTaskAction: (taskId: string, status: TaskStatus) => Promise<void>;
	toggleBlockedAction: (taskId: string, blocked: boolean) => Promise<void>;
};

function formatElapsed(since: Date): string {
	const minutes = Math.floor((Date.now() - since.getTime()) / 60_000);
	if (minutes < 1) return "agora mesmo";
	if (minutes < 60) return `há ${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours}h`;
	const days = Math.floor(hours / 24);
	return `há ${days}d`;
}

export function TaskCard({
	task,
	taskType,
	assignee,
	taskTypes,
	members,
	updateTaskAction,
	deleteTaskAction,
	moveTaskAction,
	toggleBlockedAction,
}: TaskCardProps) {
	return (
		<div
			title={taskType?.name}
			className="flex flex-col gap-2 rounded-lg border border-l-4 border-(--border) bg-(--surface) p-3 shadow-sm"
			style={{ borderLeftColor: taskType?.color ?? "#94a3b8" }}
		>
			<div className="flex items-start justify-between gap-2">
				<span className="font-mono text-xs opacity-70">{task.externalId}</span>
				<TaskFormModal
					mode="edit"
					task={task}
					taskTypes={taskTypes}
					members={members}
					updateTaskAction={updateTaskAction}
					deleteTaskAction={deleteTaskAction}
					toggleBlockedAction={toggleBlockedAction}
				/>
			</div>
			<p className="text-sm">{task.description}</p>
			<p className="text-xs opacity-70">
				{assignee ? assignee.name : "Sem responsável"}
			</p>
			<p className="text-xs opacity-50">
				{formatElapsed(task.statusChangedAt)}
			</p>
			{task.blocked ? (
				<p className="text-xs font-semibold text-red-600">⛔ Bloqueado</p>
			) : null}
			<TaskMoveSelect
				taskId={task.id}
				currentStatus={task.status}
				moveTaskAction={moveTaskAction}
			/>
		</div>
	);
}
