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

export type MetricsQueryPort = {
	listCompletedTasksInPeriod(
		teamId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<CompletedTaskMetrics[]>;
	listTasksWithDueDateInPeriod(
		teamId: string,
		periodStart: Date,
		periodEnd: Date,
	): Promise<DueDateTaskMetrics[]>;
	countWip(teamId: string): Promise<number>;
};
