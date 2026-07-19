"use client";

import type { TaskStatus } from "@/domain/task/entities/task";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type TaskMoveSelectProps = {
	taskId: string;
	currentStatus: TaskStatus;
	moveTaskAction: (taskId: string, status: TaskStatus) => Promise<void>;
};

export function TaskMoveSelect({
	taskId,
	currentStatus,
	moveTaskAction,
}: TaskMoveSelectProps) {
	return (
		<select
			aria-label="Mover para"
			value={currentStatus}
			onChange={(event) => {
				moveTaskAction(taskId, event.target.value as TaskStatus);
			}}
			className="rounded-lg border border-(--border) bg-(--surface) px-2 py-1 text-sm text-(--foreground)"
		>
			{STATUS_ORDER.map((status) => (
				<option key={status} value={status}>
					{STATUS_LABELS[status]}
				</option>
			))}
		</select>
	);
}
