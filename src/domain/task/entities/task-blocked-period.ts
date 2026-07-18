export type TaskBlockedPeriod = {
	id: string;
	taskId: string;
	blockedAt: Date;
	unblockedAt: Date | null;
};
