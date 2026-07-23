"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { isUuid } from "@/application/shared/validation";
import { createSprintUseCases } from "@/composition/sprint";
import { createTeamUseCases } from "@/composition/team";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

async function runSprintAction(operation: () => Promise<void>) {
	try {
		await operation();
		revalidatePath("/sprints");
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

async function getCurrentTeamId() {
	const team = await createTeamUseCases().getCurrentTeam();
	if (!team) throw new ApplicationError("Time não encontrado");
	return team.id;
}

export async function createProgramIncrementAction(
	_previousState: ActionState,
	formData: FormData,
) {
	return runSprintAction(async () => {
		const teamId = await getCurrentTeamId();
		await createSprintUseCases().createProgramIncrement({
			teamId,
			name: getText(formData, "name"),
			startDate: getText(formData, "startDate"),
			endDate: getText(formData, "endDate"),
		});
	});
}

export async function createSprintAction(
	piId: string,
	_previousState: ActionState,
	formData: FormData,
) {
	return runSprintAction(async () => {
		if (!isUuid(piId)) throw new ApplicationError("PI inválido");
		const teamId = await getCurrentTeamId();
		await createSprintUseCases().createSprint({
			piId,
			teamId,
			name: getText(formData, "name"),
			startDate: getText(formData, "startDate"),
			endDate: getText(formData, "endDate"),
		});
	});
}
