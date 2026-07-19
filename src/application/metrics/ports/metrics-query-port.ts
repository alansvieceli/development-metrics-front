import type { TaskStatus } from "@/domain/task/entities/task";

export type CompletedTaskMetrics = {
	taskId: string;
	createdAt: Date;
	completedAt: Date;
	statusChanges: {
		fromStatus: TaskStatus | null;
		toStatus: TaskStatus;
		changedAt: Date;
	}[];
	blockedPeriods: {
		blockedAt: Date;
		unblockedAt: Date | null;
	}[];
};

export type DueDateTaskMetrics = {
	taskId: string;
	dueDate: string;
	firstCompletedAt: Date | null;
};

type CompletionEvent = {
	taskId: string;
	createdAt: Date;
	completedAt: Date;
};

type SnapshotStatusChange = {
	taskId: string;
	fromStatus: TaskStatus | null;
	toStatus: TaskStatus;
	changedAt: Date;
};

type SnapshotBlockedPeriod = {
	taskId: string;
	blockedAt: Date;
	unblockedAt: Date | null;
};

export type MetricsSnapshot = {
	completionEvents: CompletionEvent[];
	statusChanges: SnapshotStatusChange[];
	blockedPeriods: SnapshotBlockedPeriod[];
	dueDateTasks: DueDateTaskMetrics[];
	wip: number;
};

export type MetricsQueryPort = {
	loadSnapshot(
		teamId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<MetricsSnapshot>;
};
