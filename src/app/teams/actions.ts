"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { createTeamUseCases } from "@/composition/team";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

export async function createTeamAction(
	_previousState: ActionState,
	formData: FormData,
): Promise<ActionState> {
	try {
		const name = String(formData.get("name") ?? "");
		const rawWipLimit = formData.get("wipLimit");
		const wipLimit = rawWipLimit === null ? undefined : Number(rawWipLimit);
		const useCases = createTeamUseCases();
		await useCases.createTeam(name, wipLimit);
		revalidatePath("/teams");
	} catch (error) {
		return toActionState(error);
	}
	redirect("/teams");
}
