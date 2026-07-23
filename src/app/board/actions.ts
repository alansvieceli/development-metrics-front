"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid, parseDateOnly } from "@/application/shared/validation";
import type { CreateTaskInput } from "@/application/task/use-cases/create-task";
import type { UpdateTaskInput } from "@/application/task/use-cases/update-task";
import { createTaskUseCases } from "@/composition/task";
import { createTeamUseCases } from "@/composition/team";
import { isTaskStatus, type TaskStatus } from "@/domain/task/entities/task";

export type CreateTaskActionInput = Omit<CreateTaskInput, "teamId">;

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

async function runTaskAction(operation: () => Promise<void>) {
	try {
		await operation();
		revalidatePath("/board");
		return { error: null };
	} catch (error) {
		return toActionState(error);
	}
}

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
	if (typeof value.dueDate !== "string" || !value.dueDate)
		throw new ApplicationError("Data prevista é obrigatória");
	if (!parseDateOnly(value.dueDate))
		throw new ApplicationError("Data prevista inválida");
	if (value.parentTaskId !== null)
		validateUuid(value.parentTaskId, "Task de origem inválida");
	if (value.tagIds !== undefined) {
		if (
			!Array.isArray(value.tagIds) ||
			value.tagIds.some((tagId) => !isUuid(tagId))
		) {
			throw new ApplicationError("Tarjas inválidas");
		}
	}
}

async function getCurrentTeamId() {
	const team = await createTeamUseCases().getCurrentTeam();
	if (!team) throw new ApplicationError("Time não encontrado");
	return team.id;
}

export type CreateHistoricalTaskActionInput = {
	externalId: string;
	description: string;
	typeId: string;
	assigneeId: string | null;
	dueDate: string;
	steps: { status: TaskStatus; date: string }[];
};

function validateSteps(
	steps: unknown,
): asserts steps is { status: TaskStatus; date: string }[] {
	if (!Array.isArray(steps) || steps.length === 0) {
		throw new ApplicationError("Informe ao menos uma etapa");
	}
	for (const step of steps) {
		const candidate = step as { status?: unknown; date?: unknown };
		if (!isTaskStatus(candidate.status) || typeof candidate.date !== "string") {
			throw new ApplicationError("Etapa inválida");
		}
	}
}

export async function createHistoricalTaskAction(
	input: CreateHistoricalTaskActionInput,
) {
	return runTaskAction(async () => {
		if (
			typeof input.externalId !== "string" ||
			typeof input.description !== "string"
		)
			throw new ApplicationError("Dados da task inválidos");
		validateUuid(input.typeId, "Tipo de task inválido");
		if (input.assigneeId !== null)
			validateUuid(input.assigneeId, "Responsável inválido");
		if (typeof input.dueDate !== "string" || !input.dueDate)
			throw new ApplicationError("Data prevista é obrigatória");
		if (!parseDateOnly(input.dueDate))
			throw new ApplicationError("Data prevista inválida");
		validateSteps(input.steps);
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().createHistoricalTask({
			externalId: input.externalId,
			description: input.description,
			typeId: input.typeId,
			assigneeId: input.assigneeId,
			teamId,
			dueDate: input.dueDate,
			steps: input.steps,
		});
	});
}

export async function createTaskAction(input: CreateTaskActionInput) {
	return runTaskAction(async () => {
		validateInput(input);
		if (!isTaskStatus(input.status))
			throw new ApplicationError("Status inválido");
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().createTask({ ...input, teamId });
	});
}

export async function updateTaskAction(taskId: string, input: UpdateTaskInput) {
	return runTaskAction(async () => {
		validateUuid(taskId, "Task inválida");
		validateInput(input);
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().updateTask(teamId, taskId, input);
	});
}

export async function deleteTaskAction(taskId: string) {
	return runTaskAction(async () => {
		validateUuid(taskId, "Task inválida");
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().deleteTask(teamId, taskId);
	});
}

export async function moveTaskAction(taskId: string, status: TaskStatus) {
	return runTaskAction(async () => {
		validateUuid(taskId, "Task inválida");
		if (!isTaskStatus(status)) throw new ApplicationError("Status inválido");
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().moveTask(teamId, taskId, status);
	});
}

export async function toggleBlockedAction(taskId: string, blocked: boolean) {
	return runTaskAction(async () => {
		validateUuid(taskId, "Task inválida");
		if (typeof blocked !== "boolean")
			throw new ApplicationError("Bloqueio inválido");
		const teamId = await getCurrentTeamId();
		await createTaskUseCases().toggleBlocked(teamId, taskId, blocked);
	});
}
