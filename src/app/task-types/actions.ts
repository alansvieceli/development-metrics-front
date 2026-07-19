"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import { createTaskUseCases } from "@/composition/task";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

async function runTaskTypeAction(operation: () => Promise<void>) {
	try {
		await operation();
		revalidatePath("/task-types");
		return { error: null };
	} catch (error) {
		return toActionState(error);
	}
}

function getText(formData: FormData, field: string) {
	const value = formData.get(field);
	if (typeof value !== "string") throw new ApplicationError("Dados inválidos");
	return value;
}

export async function createTaskTypeAction(
	_previousState: ActionState,
	formData: FormData,
) {
	return runTaskTypeAction(async () => {
		const name = getText(formData, "name");
		const color = getText(formData, "color");
		await createTaskUseCases().createTaskType(name, color);
	});
}

export async function updateTaskTypeAction(
	typeId: string,
	_previousState: ActionState,
	formData: FormData,
) {
	return runTaskTypeAction(async () => {
		if (!isUuid(typeId)) throw new ApplicationError("Tipo de task inválido");
		const name = getText(formData, "name");
		const color = getText(formData, "color");
		await createTaskUseCases().updateTaskType(typeId, name, color);
	});
}

export async function deleteTaskTypeAction(
	typeId: string,
	_previousState: ActionState,
	_formData: FormData,
) {
	return runTaskTypeAction(async () => {
		if (!isUuid(typeId)) throw new ApplicationError("Tipo de task inválido");
		await createTaskUseCases().deleteTaskType(typeId);
	});
}
