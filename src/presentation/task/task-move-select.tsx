"use client";

import { useEffect, useState } from "react";
import type { ActionState } from "@/application/shared/action-state";
import type { TaskStatus } from "@/domain/task/entities/task";
import {
	STATUS_LABELS,
	STATUS_ORDER,
} from "@/presentation/task/task-status-labels";

type TaskMoveSelectProps = {
	taskId: string;
	currentStatus: TaskStatus;
	moveTaskAction: (taskId: string, status: TaskStatus) => Promise<ActionState>;
};

export function TaskMoveSelect({
	taskId,
	currentStatus,
	moveTaskAction: action,
}: TaskMoveSelectProps) {
	const [selectedStatus, setSelectedStatus] = useState(currentStatus);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => setSelectedStatus(currentStatus), [currentStatus]);

	async function move(status: TaskStatus) {
		setSelectedStatus(status);
		setPending(true);
		setError(null);
		try {
			const result = await action(taskId, status);
			if (result.error) {
				setError(result.error);
				setSelectedStatus(currentStatus);
			}
		} catch {
			setError("Não foi possível concluir a operação");
			setSelectedStatus(currentStatus);
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="flex flex-col gap-1">
			<select
				aria-label="Mover para"
				value={selectedStatus}
				disabled={pending}
				onChange={(event) => move(event.target.value as TaskStatus)}
				className="rounded-lg border border-(--border) bg-(--surface) px-2 py-1 text-sm text-(--foreground)"
			>
				{STATUS_ORDER.map((status) => (
					<option key={status} value={status}>
						{STATUS_LABELS[status]}
					</option>
				))}
			</select>
			{error ? <p role="alert">{error}</p> : null}
		</div>
	);
}
