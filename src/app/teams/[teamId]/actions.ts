"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTeamUseCases } from "@/composition/team";

export async function renameTeamAction(teamId: string, formData: FormData) {
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.renameTeam(teamId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

export async function deleteTeamAction(teamId: string) {
	const useCases = createTeamUseCases();
	await useCases.deleteTeam(teamId);
	revalidatePath("/teams");
	revalidatePath("/");
}

export async function addMemberAction(teamId: string, formData: FormData) {
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.addMember(teamId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

export async function renameMemberAction(
	teamId: string,
	memberId: string,
	formData: FormData,
) {
	const name = String(formData.get("name") ?? "");
	const useCases = createTeamUseCases();
	await useCases.renameMember(memberId, name);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}

export async function removeMemberAction(teamId: string, memberId: string) {
	const useCases = createTeamUseCases();
	await useCases.removeMember(memberId);
	revalidatePath(`/teams/${teamId}`);
	redirect(`/teams/${teamId}`);
}
