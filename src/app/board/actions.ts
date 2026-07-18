"use server";

import { revalidatePath } from "next/cache";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import { createTaskUseCases } from "@/composition/task";
import type { TaskStatus } from "@/domain/task/entities/task";

export async function createTaskAction(input: CreateTaskInput) {
	const useCases = createTaskUseCases();
	await useCases.createTask(input);
	revalidatePath("/board");
}

export async function updateTaskAction(taskId: string, input: UpdateTaskInput) {
	const useCases = createTaskUseCases();
	await useCases.updateTask(taskId, input);
	revalidatePath("/board");
}

export async function deleteTaskAction(taskId: string) {
	const useCases = createTaskUseCases();
	await useCases.deleteTask(taskId);
	revalidatePath("/board");
}

export async function moveTaskAction(taskId: string, status: TaskStatus) {
	const useCases = createTaskUseCases();
	await useCases.moveTask(taskId, status);
	revalidatePath("/board");
}

export async function toggleBlockedAction(taskId: string, blocked: boolean) {
	const useCases = createTaskUseCases();
	await useCases.toggleBlocked(taskId, blocked);
	revalidatePath("/board");
}
