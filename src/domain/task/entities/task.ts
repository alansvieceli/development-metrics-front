export const TASK_STATUSES = [
	"TODO",
	"IN_DEVELOPMENT",
	"CODE_REVIEW",
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
	dueDate: string | null;
	createdAt: Date;
	updatedAt: Date;
};
