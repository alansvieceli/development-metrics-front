import type { TaskUsageQuery } from "@/application/task/contracts/task-usage-query";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	teamId: string;
	status: TaskStatus;
	dueDate: string;
	parentTaskId: string | null;
};

export type UpdateTaskData = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
	parentTaskId: string | null;
};

export type TaskRepository = TaskUsageQuery & {
	createWithInitialHistory(data: CreateTaskData): Promise<Task>;
	createWithExplicitHistory(
		data: CreateTaskData,
		history: { status: TaskStatus; changedAt: Date }[],
	): Promise<Task>;
	moveWithHistory(taskId: string, toStatus: TaskStatus): Promise<Task>;
	setBlockedWithHistory(taskId: string, blocked: boolean): Promise<Task>;
	update(taskId: string, data: UpdateTaskData): Promise<Task>;
	delete(taskId: string): Promise<void>;
	findById(taskId: string): Promise<Task | null>;
	findByExternalId(teamId: string, externalId: string): Promise<Task | null>;
	listByTeam(teamId: string): Promise<Task[]>;
	countByType(typeId: string): Promise<number>;
	listUsedTypeIds(): Promise<string[]>;
};
