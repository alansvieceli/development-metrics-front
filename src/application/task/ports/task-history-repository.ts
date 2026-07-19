export type TaskHistoryRepository = {
	getStatusChangedAtForTasks(taskIds: string[]): Promise<Record<string, Date>>;
};
