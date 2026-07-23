import type { ActionState } from "@/application/shared/action-state";
import type { TaskWithStatusSince } from "@/application/task/use-cases/list-tasks-by-team";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import type { Sprint } from "@/domain/sprint/entities/sprint";
import type { Tag } from "@/domain/task/entities/tag";
import type { TaskStatus } from "@/domain/task/entities/task";
import type { TaskType } from "@/domain/task/entities/task-type";
import type { Member } from "@/domain/team/entities/member";
import { getDueDateStatus } from "@/presentation/task/due-date-status";
import type { TeamTaskOption } from "@/presentation/task/task-form-modal";
import { TaskFormModal } from "@/presentation/task/task-form-modal";
import { TaskMoveSelect } from "@/presentation/task/task-move-select";

type TaskCardProps = {
	task: TaskWithStatusSince;
	taskType: TaskType | undefined;
	assignee: Member | undefined;
	taskTypes: TaskType[];
	tags: Tag[];
	members: Member[];
	teamTasks: TeamTaskOption[];
	sprints: Sprint[];
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

function formatElapsed(since: Date): string {
	const minutes = Math.floor((Date.now() - since.getTime()) / 60_000);
	if (minutes < 1) return "agora mesmo";
	if (minutes < 60) return `há ${minutes}min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `há ${hours}h`;
	const days = Math.floor(hours / 24);
	return `há ${days}d`;
}

function formatDueDate(dueDate: string): string {
	const [, month, day] = dueDate.split("-");
	return `${day}/${month}`;
}

function formatDate(date: Date): string {
	const day = String(date.getDate()).padStart(2, "0");
	const month = String(date.getMonth() + 1).padStart(2, "0");
	return `${day}/${month}`;
}

function dueDateClassName(status: ReturnType<typeof getDueDateStatus>): string {
	if (status === "warning") return "text-(--warn)";
	if (status === "overdue") return "text-(--critical)";
	return "opacity-70";
}

export function TaskCard({
	task,
	taskType,
	assignee,
	taskTypes,
	tags,
	members,
	teamTasks,
	sprints,
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
					teamTasks={teamTasks}
					tags={tags}
					sprints={sprints}
					initialTagIds={task.tags.map((tag) => tag.id)}
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
			<p
				className={`text-xs font-semibold ${dueDateClassName(
					getDueDateStatus(task.dueDate, task.status, new Date()),
				)}`}
			>
				Prazo: {formatDueDate(task.dueDate)}
				{task.status === "DONE"
					? ` · Concluído: ${formatDate(task.statusChangedAt)}`
					: null}
			</p>
			{task.blocked ? (
				<p className="text-xs font-semibold text-(--critical)">⛔ Bloqueado</p>
			) : null}
			{task.tags.length > 0 ? (
				<div className="flex flex-wrap gap-1">
					{task.tags.map((tag) => (
						<span
							key={tag.id}
							className="rounded-full px-2 py-0.5 text-xs text-white"
							style={{ background: tag.color }}
						>
							{tag.name}
						</span>
					))}
				</div>
			) : null}
			{task.parentTask ? (
				<p className="text-xs opacity-50">
					Origem: #{task.parentTask.externalId}
				</p>
			) : null}
			{task.bugChildCount > 0 || task.otherChildCount > 0 ? (
				<div className="flex gap-2 text-xs">
					{task.bugChildCount > 0 ? (
						<span title="Bugs originados desta task">
							🐛 {task.bugChildCount}
						</span>
					) : null}
					{task.otherChildCount > 0 ? (
						<span title="Outras tasks originadas desta task">
							🔗 {task.otherChildCount}
						</span>
					) : null}
				</div>
			) : null}
			<TaskMoveSelect
				taskId={task.id}
				currentStatus={task.status}
				moveTaskAction={moveTaskAction}
			/>
		</div>
	);
}
