export const TASK_STATUSES = [
	"TODO",
	"IN_DEVELOPMENT",
	"CODE_REVIEW",
	"TESTING",
	"AWAITING_PUBLICATION",
	"DONE",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const isTaskStatus = (value: unknown): value is TaskStatus =>
	typeof value === "string" && TASK_STATUSES.includes(value as TaskStatus);

export type Task = {
	id: string;
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	blocked: boolean;
	dueDate: string;
	createdAt: Date;
	updatedAt: Date;
};
