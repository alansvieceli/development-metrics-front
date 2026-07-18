import type { TaskStatus } from "./task";

export type TaskStatusChange = {
	id: string;
	taskId: string;
	fromStatus: TaskStatus | null;
	toStatus: TaskStatus;
	changedAt: Date;
};
