import type { Task } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { TaskFormModal } from "@/presentation/task/task-form-modal";
import { TaskMoveSelect } from "@/presentation/task/task-move-select";

type TaskCardProps = {
	task: Task;
	taskType: TaskType | undefined;
	assignee: Member | undefined;
	taskTypes: TaskType[];
	members: Member[];
};

export function TaskCard({
	task,
	taskType,
	assignee,
	taskTypes,
	members,
}: TaskCardProps) {
	return (
		<div
			title={taskType?.name}
			className="flex flex-col gap-2 rounded-lg border-l-4 bg-(--background) p-3 shadow-sm"
			style={{ borderLeftColor: taskType?.color ?? "#94a3b8" }}
		>
			<div className="flex items-start justify-between gap-2">
				<span className="font-mono text-xs opacity-70">{task.externalId}</span>
				<TaskFormModal
					mode="edit"
					task={task}
					taskTypes={taskTypes}
					members={members}
				/>
			</div>
			<p className="text-sm">{task.description}</p>
			<p className="text-xs opacity-70">
				{assignee ? assignee.name : "Sem responsável"}
			</p>
			{task.blocked ? (
				<p className="text-xs font-semibold text-red-600">⛔ Bloqueado</p>
			) : null}
			<TaskMoveSelect taskId={task.id} currentStatus={task.status} />
		</div>
	);
}
