"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

export async function selectTeamAction(teamId: string) {
	const useCases = createTeamUseCases();
	await useCases.selectTeam(teamId);
	revalidatePath("/");
	redirect("/");
}
