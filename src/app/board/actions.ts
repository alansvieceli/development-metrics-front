"use server";

import { revalidatePath } from "next/cache";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid, parseDateOnly } from "@/application/shared/validation";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { isTaskStatus, type TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskActionInput = Omit<CreateTaskInput, "teamId">;

function validateUuid(
	value: unknown,
	message: string,
): asserts value is string {
	if (!isUuid(value)) throw new ApplicationError(message);
}

function validateInput(input: unknown): asserts input is UpdateTaskInput {
	if (!input || typeof input !== "object")
		throw new ApplicationError("Dados da task inválidos");
	const value = input as Partial<UpdateTaskInput>;
	if (
		typeof value.externalId !== "string" ||
		typeof value.description !== "string"
	)
		throw new ApplicationError("Dados da task inválidos");
	validateUuid(value.typeId, "Tipo de task inválido");
	if (value.assigneeId !== null)
		validateUuid(value.assigneeId, "Responsável inválido");
	if (value.dueDate !== null && !parseDateOnly(value.dueDate))
		throw new ApplicationError("Data prevista inválida");
}

async function getCurrentTeamId() {
	const team = await createTeamUseCases().getCurrentTeam();
	if (!team) throw new ApplicationError("Time não encontrado");
	return team.id;
}

export async function createTaskAction(input: CreateTaskActionInput) {
	validateInput(input);
	if (!isTaskStatus(input.status))
		throw new ApplicationError("Status inválido");
	const teamId = await getCurrentTeamId();
	const useCases = createTaskUseCases();
	await useCases.createTask({ ...input, teamId });
	revalidatePath("/board");
}

export async function updateTaskAction(taskId: string, input: UpdateTaskInput) {
	validateUuid(taskId, "Task inválida");
	validateInput(input);
	const teamId = await getCurrentTeamId();
	const useCases = createTaskUseCases();
	await useCases.updateTask(teamId, taskId, input);
	revalidatePath("/board");
}

export async function deleteTaskAction(taskId: string) {
	validateUuid(taskId, "Task inválida");
	const teamId = await getCurrentTeamId();
	const useCases = createTaskUseCases();
	await useCases.deleteTask(teamId, taskId);
	revalidatePath("/board");
}

export async function moveTaskAction(taskId: string, status: TaskStatus) {
	validateUuid(taskId, "Task inválida");
	if (!isTaskStatus(status)) throw new ApplicationError("Status inválido");
	const teamId = await getCurrentTeamId();
	const useCases = createTaskUseCases();
	await useCases.moveTask(teamId, taskId, status);
	revalidatePath("/board");
}

export async function toggleBlockedAction(taskId: string, blocked: boolean) {
	validateUuid(taskId, "Task inválida");
	if (typeof blocked !== "boolean")
		throw new ApplicationError("Bloqueio inválido");
	const teamId = await getCurrentTeamId();
	const useCases = createTaskUseCases();
	await useCases.toggleBlocked(teamId, taskId, blocked);
	revalidatePath("/board");
}
