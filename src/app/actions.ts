"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { MetricsPeriodPreference } from "@/application/metrics/ports/metrics-period-preference-store";
import type { ActionState } from "@/application/shared/action-state";
import { ApplicationError } from "@/application/shared/application-error";
import { createMetricsUseCases } from "@/composition/metrics";
import { createTeamUseCases } from "@/composition/team";

function toActionState(error: unknown): ActionState {
	if (error instanceof ApplicationError) return { error: error.message };
	console.error(error);
	return { error: "Não foi possível concluir a operação" };
}

export async function selectTeamAction(teamId: string): Promise<ActionState> {
	try {
		const useCases = createTeamUseCases();
		await useCases.selectTeam(teamId);
		revalidatePath("/");
	} catch (error) {
		return toActionState(error);
	}
	redirect("/");
}

export async function saveMetricsPeriodPreferenceAction(
	teamId: string,
	preference: MetricsPeriodPreference,
): Promise<void> {
	await createMetricsUseCases().setMetricsPeriodPreference(teamId, preference);
}
