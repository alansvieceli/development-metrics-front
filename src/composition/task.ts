import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import { createTask } from "@/application/task/use-cases/create-task";
import { createTaskType } from "@/application/task/use-cases/create-task-type";
import { deleteTask } from "@/application/task/use-cases/delete-task";
import { deleteTaskType } from "@/application/task/use-cases/delete-task-type";
import { listTaskTypes } from "@/application/task/use-cases/list-task-types";
import { listTasksByTeam } from "@/application/task/use-cases/list-tasks-by-team";
import { moveTask } from "@/application/task/use-cases/move-task";
import { toggleBlocked } from "@/application/task/use-cases/toggle-blocked";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import { updateTask } from "@/application/task/use-cases/update-task";
import { updateTaskType } from "@/application/task/use-cases/update-task-type";
import type { TaskStatus } from "@/domain/task/entities/task";
import { drizzleTaskHistoryRepository } from "@/infrastructure/task/drizzle-task-history-repository";
import { drizzleTaskRepository } from "@/infrastructure/task/drizzle-task-repository";
import { drizzleTaskTypeRepository } from "@/infrastructure/task/drizzle-task-type-repository";

export function createTaskUseCases() {
	return {
		createTask: (input: CreateTaskInput) =>
			createTask(drizzleTaskRepository, drizzleTaskHistoryRepository, input),
		updateTask: (taskId: string, input: UpdateTaskInput) =>
			updateTask(drizzleTaskRepository, taskId, input),
		deleteTask: (taskId: string) => deleteTask(drizzleTaskRepository, taskId),
		moveTask: (taskId: string, toStatus: TaskStatus) =>
			moveTask(
				drizzleTaskRepository,
				drizzleTaskHistoryRepository,
				taskId,
				toStatus,
			),
		toggleBlocked: (taskId: string, blocked: boolean) =>
			toggleBlocked(
				drizzleTaskRepository,
				drizzleTaskHistoryRepository,
				taskId,
				blocked,
			),
		listTasksByTeam: (teamId: string) =>
			listTasksByTeam(drizzleTaskRepository, teamId),
		createTaskType: (name: string, color: string) =>
			createTaskType(drizzleTaskTypeRepository, name, color),
		updateTaskType: (typeId: string, name: string, color: string) =>
			updateTaskType(drizzleTaskTypeRepository, typeId, name, color),
		deleteTaskType: (typeId: string) =>
			deleteTaskType(drizzleTaskTypeRepository, drizzleTaskRepository, typeId),
		listTaskTypes: () =>
			listTaskTypes(drizzleTaskTypeRepository, drizzleTaskRepository),
	};
}
