"use server";

import { revalidatePath } from "next/cache";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import { createTaskUseCases } from "@/composition/task";

function getText(formData: FormData, field: string) {
	const value = formData.get(field);
	if (typeof value !== "string") throw new ApplicationError("Dados inválidos");
	return value;
}

export async function createTaskTypeAction(formData: FormData) {
	const name = getText(formData, "name");
	const color = getText(formData, "color");
	const useCases = createTaskUseCases();
	await useCases.createTaskType(name, color);
	revalidatePath("/task-types");
}

export async function updateTaskTypeAction(typeId: string, formData: FormData) {
	if (!isUuid(typeId)) throw new ApplicationError("Tipo de task inválido");
	const name = getText(formData, "name");
	const color = getText(formData, "color");
	const useCases = createTaskUseCases();
	await useCases.updateTaskType(typeId, name, color);
	revalidatePath("/task-types");
}

export async function deleteTaskTypeAction(typeId: string) {
	if (!isUuid(typeId)) throw new ApplicationError("Tipo de task inválido");
	const useCases = createTaskUseCases();
	await useCases.deleteTaskType(typeId);
	revalidatePath("/task-types");
}
