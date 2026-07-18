"use client";

import { moveTaskAction } from "@/app/board/actions";
import type { TaskStatus } from "@/domain/task/entities/task";
import { STATUS_LABELS, STATUS_ORDER } from "@/presentation/task/task-status-labels";

type TaskMoveSelectProps = {
	taskId: string;
	currentStatus: TaskStatus;
};

export function TaskMoveSelect({ taskId, currentStatus }: TaskMoveSelectProps) {
	return (
		<select
			aria-label="Mover para"
			value={currentStatus}
			onChange={(event) => {
				moveTaskAction(taskId, event.target.value as TaskStatus);
			}}
			className="rounded-lg border border-(--border) px-2 py-1 text-sm"
		>
			{STATUS_ORDER.map((status) => (
				<option key={status} value={status}>
					{STATUS_LABELS[status]}
				</option>
			))}
		</select>
	);
}
