"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

export async function createTeamAction(formData: FormData) {
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.createTeam(name);
	revalidatePath("/teams");
	redirect("/teams");
}
