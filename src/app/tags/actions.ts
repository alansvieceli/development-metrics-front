"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import { createTaskUseCases } from "@/composition/task";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	if (error instanceof Error) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

async function runTagAction(operation: () => Promise<void>) {
	try {
		await operation();
		revalidatePath("/tags");
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

export async function createTagAction(
	_previousState: ActionState,
	formData: FormData,
) {
	return runTagAction(async () => {
		const name = getText(formData, "name");
		const color = getText(formData, "color");
		await createTaskUseCases().createTag(name, color);
	});
}

export async function updateTagAction(
	tagId: string,
	_previousState: ActionState,
	formData: FormData,
) {
	return runTagAction(async () => {
		if (!isUuid(tagId)) throw new ApplicationError("Tarja inválida");
		const name = getText(formData, "name");
		const color = getText(formData, "color");
		await createTaskUseCases().updateTag(tagId, name, color);
	});
}

export async function deleteTagAction(
	tagId: string,
	_previousState: ActionState,
	_formData: FormData,
) {
	return runTagAction(async () => {
		if (!isUuid(tagId)) throw new ApplicationError("Tarja inválida");
		await createTaskUseCases().deleteTag(tagId);
	});
}
