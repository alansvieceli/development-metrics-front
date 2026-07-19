import type { TaskStatus } from "@/domain/task/entities/task";

export type MetricTaskEvidence = {
	taskId: string;
	externalId: string;
	description: string;
};

export type CompletedTaskMetrics = MetricTaskEvidence & {
	createdAt: Date;
	completedAt: Date;
	dueDate: string;
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

export type DueDateTaskMetrics = MetricTaskEvidence & {
	dueDate: string;
	firstCompletedAt: Date | null;
};

type CompletionEvent = MetricTaskEvidence & {
	createdAt: Date;
	completedAt: Date;
	dueDate: string;
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

export type CurrentWipTaskMetrics = {
	status: TaskStatus;
	statusChangedAt: Date;
	blockedAt: Date | null;
};

export type BugEvent = {
	taskId: string;
	createdAt: Date;
	parentTaskId: string | null;
	parentExternalId: string | null;
	parentDescription: string | null;
};

export type MetricsSnapshot = {
	completionEvents: CompletionEvent[];
	statusChanges: SnapshotStatusChange[];
	blockedPeriods: SnapshotBlockedPeriod[];
	dueDateTasks: DueDateTaskMetrics[];
	currentWipTasks: CurrentWipTaskMetrics[];
	bugEvents: BugEvent[];
};

export type MetricsQueryPort = {
	loadSnapshot(
		teamId: string,
		periodStart: Date,
		periodEnd: Date,
		assigneeId?: string,
	): Promise<MetricsSnapshot>;
};
