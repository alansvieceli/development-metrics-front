"use server";

import { revalidatePath } from "next/cache";
import { createTaskUseCases } from "@/composition/task";

export async function createTaskTypeAction(formData: FormData) {
	const name = String(formData.get("name") ?? "");
	const color = String(formData.get("color") ?? "");
	const useCases = createTaskUseCases();
	await useCases.createTaskType(name, color);
	revalidatePath("/task-types");
}

export async function updateTaskTypeAction(
	typeId: string,
	formData: FormData,
) {
	const name = String(formData.get("name") ?? "");
	const color = String(formData.get("color") ?? "");
	const useCases = createTaskUseCases();
	await useCases.updateTaskType(typeId, name, color);
	revalidatePath("/task-types");
}

export async function deleteTaskTypeAction(typeId: string) {
	const useCases = createTaskUseCases();
	await useCases.deleteTaskType(typeId);
	revalidatePath("/task-types");
}
