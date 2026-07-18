export type TaskStatus = "TODO" | "IN_DEVELOPMENT" | "CODE_REVIEW" | "DONE";

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
