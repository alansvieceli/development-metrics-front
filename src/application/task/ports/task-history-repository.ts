import type { TaskStatus } from "@/domain/task/entities/task";

export type TaskHistoryRepository = {
	recordStatusChange(
		taskId: string,
		fromStatus: TaskStatus | null,
		toStatus: TaskStatus,
	): Promise<void>;
	openBlockedPeriod(taskId: string): Promise<void>;
	closeBlockedPeriod(taskId: string): Promise<void>;
};
