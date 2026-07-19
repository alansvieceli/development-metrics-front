export type TaskUsageQuery = {
	hasTasksForTeam(teamId: string): Promise<boolean>;
	hasTasksForAssignee(assigneeId: string): Promise<boolean>;
};
