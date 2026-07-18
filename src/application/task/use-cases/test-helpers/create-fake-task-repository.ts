import type {
	CreateTaskData,
	TaskRepository,
	UpdateTaskData,
} from "@/application/task/ports/task-repository";
import type { Task, TaskStatus } from "@/domain/task/entities/task";

export function createFakeTaskRepository(): TaskRepository {
	let tasks: Task[] = [];
	let nextId = 1;

	return {
		async create(data: CreateTaskData) {
			const now = new Date();
			const task: Task = {
				id: `task-${nextId++}`,
				externalId: data.externalId,
				description: data.description,
				typeId: data.typeId,
				assigneeId: data.assigneeId,
				teamId: data.teamId,
				status: data.status,
				blocked: false,
				dueDate: data.dueDate,
				createdAt: now,
				updatedAt: now,
			};
			tasks.push(task);
			return task;
		},
		async update(taskId: string, data: UpdateTaskData) {
			const task = tasks.find((t) => t.id === taskId);
			if (!task) {
				throw new Error("Task não encontrada");
			}
			task.externalId = data.externalId;
			task.description = data.description;
			task.typeId = data.typeId;
			task.assigneeId = data.assigneeId;
			task.dueDate = data.dueDate;
			task.updatedAt = new Date();
			return task;
		},
		async delete(taskId: string) {
			tasks = tasks.filter((t) => t.id !== taskId);
		},
		async findById(taskId: string) {
			return tasks.find((t) => t.id === taskId) ?? null;
		},
		async findByExternalId(teamId: string, externalId: string) {
			return (
				tasks.find(
					(t) => t.teamId === teamId && t.externalId === externalId,
				) ?? null
			);
		},
		async listByTeam(teamId: string) {
			return tasks.filter((t) => t.teamId === teamId);
		},
		async updateStatus(taskId: string, status: TaskStatus) {
			const task = tasks.find((t) => t.id === taskId);
			if (!task) {
				throw new Error("Task não encontrada");
			}
			task.status = status;
			task.updatedAt = new Date();
			return task;
		},
		async updateBlocked(taskId: string, blocked: boolean) {
			const task = tasks.find((t) => t.id === taskId);
			if (!task) {
				throw new Error("Task não encontrada");
			}
			task.blocked = blocked;
			task.updatedAt = new Date();
			return task;
		},
		async countByType(typeId: string) {
			return tasks.filter((t) => t.typeId === typeId).length;
		},
	};
}
