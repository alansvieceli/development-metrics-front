import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string | null;
};

export type UpdateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string | null;
};

export type TaskRepository = {
	create(data: CreateTaskData): Promise<Task>;
	update(taskId: string, data: UpdateTaskData): Promise<Task>;
	delete(taskId: string): Promise<void>;
	findById(taskId: string): Promise<Task | null>;
	findByExternalId(teamId: string, externalId: string): Promise<Task | null>;
	listByTeam(teamId: string): Promise<Task[]>;
	updateStatus(taskId: string, status: TaskStatus): Promise<Task>;
	updateBlocked(taskId: string, blocked: boolean): Promise<Task>;
	countByType(typeId: string): Promise<number>;
};
