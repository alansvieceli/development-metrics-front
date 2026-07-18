import type { TaskType } from "@/domain/task/entities/task-type";

export type TaskTypeRepository = {
	create(name: string, color: string): Promise<TaskType>;
	update(typeId: string, name: string, color: string): Promise<TaskType>;
	delete(typeId: string): Promise<void>;
	listAll(): Promise<TaskType[]>;
	findById(typeId: string): Promise<TaskType | null>;
};
